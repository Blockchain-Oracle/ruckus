// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {
    ICasinoGameV2,
    SessionContext,
    SessionPhase,
    StepResult
} from "./interfaces/ICasinoGameV2.sol";

/// @title RUCKUS — class-table casino game (ADR-001, ADR-004)
/// @notice Every bet type is a constant table of (weight, multiplier) outcome classes. The VRF word
///         picks a class by unbiased rejection sampling; the client only *presents* the drawn class.
///         `_payout` is the single source of truth for caps, risk quotes, reserve and settlement, so
///         the reserved profit and the settled payout always agree to the wei.
/// @dev    gameData  = abi.encode(uint8 betType, uint8 presentationVersion, bytes params)
///         gameState = abi.encode(uint8 betType, uint8 presentationVersion, bytes params,
///                                uint8 outcomeClass, uint256 payout)   (outcomeClass = CLASS_PENDING until settled)
contract RuckusGame is ICasinoGameV2 {
    uint256 private constant BPS = 10_000;
    uint256 private constant DECLARED_RTP_BPS = 9_600;
    /// @dev 1e18 (WAD) / 1e8 (BPS²): converts a per-unit variance numerator in BPS² into WAD units.
    uint256 private constant VARIANCE_BPS2_TO_WAD = 1e10;
    uint256 private constant WAD = 1e18;
    uint8 public constant CLASS_PENDING = type(uint8).max;

    // ── Bet types ────────────────────────────────────────────────────────────────────────────
    /// @notice Chickenz "Back Your Chicken": back one of 4 fighters in a VRF-seeded bot free-for-all.
    ///         params = abi.encode(uint8 fighterIndex). Classes: flawless win, win, 2nd place, lose.
    uint8 public constant BET_BACK_CHICKEN = 0;
    uint8 public constant CHICKENZ_FIGHTERS = 4;
    /// @notice 8-ball "Call Your Shot": call a ball and a pocket on a real table; the tier is the
    ///         shot's difficulty (straight, cut, thin, long). params = abi.encode(uint8 ball, uint8 pocket).
    ///         Classes: make, miss. Every tier pays the one declared RTP.
    uint8 public constant BET_CALL_SHOT_STRAIGHT = 1;
    uint8 public constant BET_CALL_SHOT_CUT = 2;
    uint8 public constant BET_CALL_SHOT_THIN = 3;
    uint8 public constant BET_CALL_SHOT_LONG = 4;
    uint8 public constant POOL_OBJECT_BALLS = 15;
    uint8 public constant POOL_POCKETS = 6;
    /// @notice Egg Soccer "Call the Finish": a VRF-seeded 2v2 bot match plays 20 s of golden goal;
    ///         you call how it ends. The finish table (twentieths) per team is shot 3, header 3,
    ///         off the woodwork 2, plus no goal 4. Each call is its own two-class table (make, miss)
    ///         covering some of those finishes, paying 96% exactly. params = empty.
    ///         Order: Tomato, Violet, Tomato shot/header/wood, Violet shot/header/wood,
    ///         either shot/header/wood, any goal, no goal.
    uint8 public constant BET_FINISH_FIRST = 5;
    uint8 public constant BET_FINISH_LAST = 17;
    uint256 private constant FINISH_DENOMINATOR = 20;
    /// @notice Neon Dash "Call the Wipeout": a VRF-seeded bot runs a short all-barrier gauntlet
    ///         with no coins, so its first hit ends the run. You call what stops it. The ending
    ///         table (twentieths) is jump barrier 5, duck 6, dodge 3, strict duck 2, clean run 4.
    ///         Each call is its own two-class table (make, miss) paying 96% exactly. params = empty.
    ///         Order: any wipeout, jump, duck, dodge, strict duck, clean run.
    uint8 public constant BET_WIPEOUT_FIRST = 18;
    uint8 public constant BET_WIPEOUT_LAST = 23;
    uint256 private constant WIPEOUT_DENOMINATOR = 20;

    error RuckusGame__UnknownBetType(uint8 betType);
    error RuckusGame__InvalidParams(uint8 betType);
    error RuckusGame__NoPlayerAction();

    // ── ICasinoGameV2 ────────────────────────────────────────────────────────────────────────

    function quoteCaps(uint256 wager, bytes calldata gameData)
        external
        pure
        returns (uint256 maxEscrowStake, uint256 maxReservedProfit)
    {
        (uint8 betType,,) = _decodeBet(gameData);
        maxEscrowStake = wager;
        maxReservedProfit = _maxReservedProfit(wager, betType);
    }

    function quoteRiskParams(uint256 wager, bytes calldata gameData)
        external
        pure
        returns (
            uint256 maxPayout,
            uint256 probabilityWad,
            uint256 expectedPayout,
            uint256 bodyVarianceScaled
        )
    {
        (uint8 betType,,) = _decodeBet(gameData);
        (uint256[] memory weights, uint256[] memory multipliersBps) = _table(betType);
        uint256 denominator = _sum(weights);
        uint256 top = _topClass(multipliersBps);

        maxPayout = _payout(wager, betType, top);
        probabilityWad = (weights[top] * WAD) / denominator;

        uint256 weightedMultiplierSum;
        for (uint256 i = 0; i < weights.length; ++i) {
            weightedMultiplierSum += weights[i] * multipliersBps[i];
        }
        expectedPayout = (wager * weightedMultiplierSum) / (denominator * BPS);
        bodyVarianceScaled = _bodyVarianceScaled(wager, weights, multipliersBps, denominator, top);
    }

    function onSessionStart(SessionContext calldata ctx)
        external
        pure
        returns (StepResult memory result)
    {
        (uint8 betType, uint8 presentationVersion, bytes memory params) = _decodeBet(ctx.gameData);
        result.newGameState =
            abi.encode(betType, presentationVersion, params, CLASS_PENDING, uint256(0));
        result.reservedProfitDelta = int256(_maxReservedProfit(ctx.wagerBase, betType));
        result.nextPhase = SessionPhase.WAITING_RANDOMNESS;
        result.requestRandomnessNow = true;
    }

    function onPlayerAction(SessionContext calldata, bytes calldata)
        external
        pure
        returns (StepResult memory)
    {
        revert RuckusGame__NoPlayerAction();
    }

    function onRandomness(SessionContext calldata ctx, bytes32 randomness)
        external
        pure
        returns (StepResult memory result)
    {
        (uint8 betType, uint8 presentationVersion, bytes memory params) = _decodeBet(ctx.gameData);
        (uint256[] memory weights,) = _table(betType);
        uint8 outcomeClass = uint8(drawClass(randomness, weights));
        uint256 payout = _payout(ctx.wagerBase, betType, outcomeClass);

        result.newGameState = abi.encode(betType, presentationVersion, params, outcomeClass, payout);
        // reservedProfitDelta stays 0: the host releases the reserve itself; releasing it here would
        // shrink the payout cap below the win (CONTRACT_CONSTRAINTS.md § Payout cap).
        result.nextPhase = SessionPhase.SETTLED;
        result.payout = payout;
    }

    /// @notice Single-draw rounds have nothing cashable mid-round.
    function quoteForfeitPayout(SessionContext calldata) external pure returns (uint256) {
        return 0;
    }

    // ── Public helpers (used by tests, tooling and the TS mirror parity vectors) ─────────────

    /// @notice Unbiased class draw: rejection-sample a uint256 below the largest multiple of the
    ///         table denominator, re-hashing on rejection, then pick by cumulative weight.
    function drawClass(bytes32 randomness, uint256[] memory weights) public pure returns (uint256) {
        uint256 denominator = _sum(weights);
        // 2^256 mod denominator; values in the top `excess` slots would bias low classes.
        uint256 excess = (type(uint256).max % denominator + 1) % denominator;
        bytes32 seed = randomness;
        while (excess != 0 && uint256(seed) > type(uint256).max - excess) {
            seed = keccak256(abi.encodePacked(seed));
        }
        uint256 ticket = uint256(seed) % denominator;
        uint256 cumulative;
        for (uint256 i = 0; i < weights.length; ++i) {
            cumulative += weights[i];
            if (ticket < cumulative) return i;
        }
        revert RuckusGame__UnknownBetType(type(uint8).max); // unreachable: ticket < denominator
    }

    function betTable(uint8 betType)
        external
        pure
        returns (uint256[] memory weights, uint256[] memory multipliersBps)
    {
        return _table(betType);
    }

    // ── Internals ────────────────────────────────────────────────────────────────────────────

    function _table(uint8 betType)
        internal
        pure
        returns (uint256[] memory weights, uint256[] memory multipliersBps)
    {
        if (betType == BET_BACK_CHICKEN) {
            // RTP = (1·60000 + 4·28000 + 5·4000 + 10·0) / (20·10000) = 96.00%
            weights = new uint256[](4);
            multipliersBps = new uint256[](4);
            (weights[0], multipliersBps[0]) = (1, 60_000); // flawless win — 6.0×
            (weights[1], multipliersBps[1]) = (4, 28_000); // win — 2.8×
            (weights[2], multipliersBps[2]) = (5, 4_000); //  2nd place — 0.4×
            (weights[3], multipliersBps[3]) = (10, 0); //     lose
            return (weights, multipliersBps);
        }
        // Call Your Shot tiers: (make weight, miss weight, make multiplier), each 96.00% exactly.
        if (betType == BET_CALL_SHOT_STRAIGHT) return _makeMiss(3, 1, 12_800); // 3/4 × 1.28
        if (betType == BET_CALL_SHOT_CUT) return _makeMiss(1, 1, 19_200); //      1/2 × 1.92
        if (betType == BET_CALL_SHOT_THIN) return _makeMiss(1, 3, 38_400); //     1/4 × 3.84
        if (betType == BET_CALL_SHOT_LONG) return _makeMiss(1, 9, 96_000); //     1/10 × 9.6
        if (betType >= BET_FINISH_FIRST && betType <= BET_FINISH_LAST) {
            uint256 make = _finishCover(betType);
            // make/20 × (0.96·20/make) = 96.00%; every cover divides 192_000 exactly.
            return _makeMiss(
                make, FINISH_DENOMINATOR - make, (DECLARED_RTP_BPS * FINISH_DENOMINATOR) / make
            );
        }
        if (betType >= BET_WIPEOUT_FIRST && betType <= BET_WIPEOUT_LAST) {
            uint256 make = _wipeoutCover(betType);
            // make/20 × (0.96·20/make) = 96.00%; every cover divides 192_000 exactly.
            return _makeMiss(
                make, WIPEOUT_DENOMINATOR - make, (DECLARED_RTP_BPS * WIPEOUT_DENOMINATOR) / make
            );
        }
        revert RuckusGame__UnknownBetType(betType);
    }

    function _makeMiss(uint256 makeWeight, uint256 missWeight, uint256 makeBps)
        internal
        pure
        returns (uint256[] memory weights, uint256[] memory multipliersBps)
    {
        weights = new uint256[](2);
        multipliersBps = new uint256[](2);
        (weights[0], multipliersBps[0]) = (makeWeight, makeBps); // make
        (weights[1], multipliersBps[1]) = (missWeight, 0); //       miss
    }

    /// @dev How many twentieths of the golden-goal finish table a call covers.
    function _finishCover(uint8 betType) internal pure returns (uint256) {
        uint8[13] memory cover = [8, 8, 3, 3, 2, 3, 3, 2, 6, 6, 4, 16, 4];
        return cover[betType - BET_FINISH_FIRST];
    }

    /// @dev How many twentieths of the gauntlet's ending table a call covers.
    function _wipeoutCover(uint8 betType) internal pure returns (uint256) {
        uint8[6] memory cover = [16, 5, 6, 3, 2, 4];
        return cover[betType - BET_WIPEOUT_FIRST];
    }

    function _decodeBet(bytes calldata gameData)
        internal
        pure
        returns (uint8 betType, uint8 presentationVersion, bytes memory params)
    {
        (betType, presentationVersion, params) = abi.decode(gameData, (uint8, uint8, bytes));
        _table(betType); // reverts on unknown bet types before any funds move
        _validateParams(betType, params);
    }

    function _validateParams(uint8 betType, bytes memory params) internal pure {
        if (betType == BET_BACK_CHICKEN) {
            if (params.length != 32) revert RuckusGame__InvalidParams(betType);
            uint8 fighter = abi.decode(params, (uint8));
            if (fighter >= CHICKENZ_FIGHTERS) revert RuckusGame__InvalidParams(betType);
        } else if (betType >= BET_FINISH_FIRST) {
            // Call the Finish and Call the Wipeout: the call is the bet type itself.
            if (params.length != 0) revert RuckusGame__InvalidParams(betType);
        } else {
            // Call Your Shot: a real object ball and one of the six pockets.
            if (params.length != 64) revert RuckusGame__InvalidParams(betType);
            (uint8 ball, uint8 pocket) = abi.decode(params, (uint8, uint8));
            if (ball == 0 || ball > POOL_OBJECT_BALLS || pocket >= POOL_POCKETS) {
                revert RuckusGame__InvalidParams(betType);
            }
        }
    }

    /// @dev The one payout function (see contract natspec).
    function _payout(uint256 wager, uint8 betType, uint256 outcomeClass)
        internal
        pure
        returns (uint256)
    {
        (, uint256[] memory multipliersBps) = _table(betType);
        return (wager * multipliersBps[outcomeClass]) / BPS;
    }

    function _maxReservedProfit(uint256 wager, uint8 betType) internal pure returns (uint256) {
        (, uint256[] memory multipliersBps) = _table(betType);
        uint256 maxPayout = _payout(wager, betType, _topClass(multipliersBps));
        return maxPayout > wager ? maxPayout - wager : 0;
    }

    /// @dev Variance of the payout with the top class removed, in wei² × 1e18 (SLOTS_RISK_AND_RESERVES.md):
    ///      σ²·WAD = (D·Σ'w·M² − (Σ'w·M)²) · 1e10 / D², then × wager².
    function _bodyVarianceScaled(
        uint256 wager,
        uint256[] memory weights,
        uint256[] memory multipliersBps,
        uint256 denominator,
        uint256 top
    ) internal pure returns (uint256) {
        uint256 sumWM;
        uint256 sumWM2;
        for (uint256 i = 0; i < weights.length; ++i) {
            if (i == top) continue;
            sumWM += weights[i] * multipliersBps[i];
            sumWM2 += weights[i] * multipliersBps[i] * multipliersBps[i];
        }
        uint256 numerator = denominator * sumWM2 - sumWM * sumWM;
        return (wager * wager * numerator * VARIANCE_BPS2_TO_WAD) / (denominator * denominator);
    }

    function _topClass(uint256[] memory multipliersBps) internal pure returns (uint256 top) {
        for (uint256 i = 1; i < multipliersBps.length; ++i) {
            if (multipliersBps[i] > multipliersBps[top]) top = i;
        }
    }

    function _sum(uint256[] memory values) internal pure returns (uint256 total) {
        for (uint256 i = 0; i < values.length; ++i) {
            total += values[i];
        }
    }
}
