// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Test} from "forge-std/Test.sol";

import {SessionContext, SessionPhase, StepResult} from "../src/interfaces/ICasinoGameV2.sol";
import {RuckusGame} from "../src/RuckusGame.sol";

contract RuckusGameTest is Test {
    uint256 private constant BPS = 10_000;
    uint256 private constant MAX_WAGER = 1e27; // 1e9 tokens at 18 decimals
    uint256 private constant DECLARED_RTP_BPS = 9_600;

    RuckusGame private game;

    function setUp() public {
        game = new RuckusGame();
    }

    function _gameData(uint8 betType, uint8 fighter) private pure returns (bytes memory) {
        return abi.encode(betType, uint8(1), abi.encode(fighter));
    }

    function _ctx(uint256 wager, bytes memory gameData) private pure returns (SessionContext memory ctx) {
        ctx.wagerBase = wager;
        ctx.escrowedStake = wager;
        ctx.gameData = gameData;
    }

    /// Declared math = paytable: exact RTP from the on-chain table.
    function test_backChicken_rtpIsExactlyDeclared() public view {
        (uint256[] memory weights, uint256[] memory multipliersBps) = game.betTable(game.BET_BACK_CHICKEN());
        uint256 denominator;
        uint256 weighted;
        for (uint256 i = 0; i < weights.length; ++i) {
            denominator += weights[i];
            weighted += weights[i] * multipliersBps[i];
        }
        assertEq(weighted, DECLARED_RTP_BPS * denominator, "RTP must be exactly 96.00%");
    }

    /// The payout-cap trap: every class, including the top multiplier, must fit escrow + reserve.
    function testFuzz_payoutNeverExceedsCap(uint256 wager, bytes32 randomness, uint8 fighter) public view {
        wager = bound(wager, 1, MAX_WAGER);
        fighter = uint8(bound(fighter, 0, game.CHICKENZ_FIGHTERS() - 1));
        bytes memory data = _gameData(game.BET_BACK_CHICKEN(), fighter);
        SessionContext memory ctx = _ctx(wager, data);

        StepResult memory start = game.onSessionStart(ctx);
        assertEq(uint8(start.nextPhase), uint8(SessionPhase.WAITING_RANDOMNESS));
        assertTrue(start.requestRandomnessNow);
        (uint256 maxEscrow, uint256 maxReserve) = game.quoteCaps(wager, data);
        assertEq(maxEscrow, wager);
        assertEq(uint256(start.reservedProfitDelta), maxReserve);

        ctx.reservedProfit = maxReserve;
        ctx.gameState = start.newGameState;
        StepResult memory settle = game.onRandomness(ctx, randomness);
        assertEq(uint8(settle.nextPhase), uint8(SessionPhase.SETTLED));
        assertEq(settle.reservedProfitDelta, 0, "never release reserve on the settling step");
        assertLe(settle.payout, wager + maxReserve);
    }

    /// Top multiplier settles at exactly escrow + reserve, to the wei.
    function testFuzz_topMultiplierFitsExactly(uint256 wager) public view {
        wager = bound(wager, 1, MAX_WAGER);
        bytes memory data = _gameData(game.BET_BACK_CHICKEN(), 0);
        (uint256 maxPayout,,,) = game.quoteRiskParams(wager, data);
        (, uint256 maxReserve) = game.quoteCaps(wager, data);
        assertEq(maxPayout, wager + maxReserve);
    }

    function test_riskParams_matchTable() public view {
        uint256 wager = 10e18;
        (uint256 maxPayout, uint256 probabilityWad, uint256 expectedPayout, uint256 bodyVariance) =
            game.quoteRiskParams(wager, _gameData(game.BET_BACK_CHICKEN(), 2));
        assertEq(maxPayout, 60e18); // 6.0×
        assertEq(probabilityWad, 5e16); // 1/20
        assertEq(expectedPayout, 9.6e18); // 96%
        // Body (top class removed), per unit: Σ'pM = (4·2.8 + 5·0.4)/20 = 0.66, Σ'pM² = (4·7.84 + 5·0.16)/20 = 1.608,
        // σ² = 1.608 − 0.4356 = 1.1724 → wager² · σ² · 1e18 = 100e36 · 1.1724e18
        assertEq(bodyVariance, 100e36 * 1.1724e18);
    }

    /// 2^256 mod 20 = 16, so the top 16 uint256 values must be rejected and re-hashed.
    function test_drawClass_rejectsBiasedTail() public view {
        (uint256[] memory weights,) = game.betTable(game.BET_BACK_CHICKEN());
        bytes32 maxWord = bytes32(type(uint256).max);
        bytes32 rehashed = keccak256(abi.encodePacked(maxWord));
        assertEq(game.drawClass(maxWord, weights), game.drawClass(rehashed, weights));
        // Just below the rejected tail is accepted as-is: (2^256 − 17) mod 20 = 19 → last class.
        assertEq(game.drawClass(bytes32(type(uint256).max - 16), weights), 3);
    }

    function test_drawClass_cumulativeBoundaries() public view {
        (uint256[] memory weights,) = game.betTable(game.BET_BACK_CHICKEN());
        assertEq(game.drawClass(bytes32(uint256(0)), weights), 0); // ticket 0     → flawless
        assertEq(game.drawClass(bytes32(uint256(1)), weights), 1); // ticket 1..4  → win
        assertEq(game.drawClass(bytes32(uint256(4)), weights), 1);
        assertEq(game.drawClass(bytes32(uint256(5)), weights), 2); // ticket 5..9  → 2nd
        assertEq(game.drawClass(bytes32(uint256(10)), weights), 3); // ticket 10..19 → lose
        assertEq(game.drawClass(bytes32(uint256(39)), weights), 3);
    }

    function test_revert_unknownBetType() public {
        vm.expectRevert(abi.encodeWithSelector(RuckusGame.RuckusGame__UnknownBetType.selector, uint8(7)));
        game.quoteCaps(1e18, _gameData(7, 0));
    }

    function test_revert_invalidFighter() public {
        vm.expectRevert(abi.encodeWithSelector(RuckusGame.RuckusGame__InvalidParams.selector, uint8(0)));
        game.quoteCaps(1e18, _gameData(0, 4));
    }

    function test_revert_noPlayerAction() public {
        vm.expectRevert(RuckusGame.RuckusGame__NoPlayerAction.selector);
        game.onPlayerAction(_ctx(1e18, _gameData(0, 0)), "");
    }

    function test_forfeitQuoteIsZero() public view {
        assertEq(game.quoteForfeitPayout(_ctx(1e18, _gameData(0, 0))), 0);
    }
}
