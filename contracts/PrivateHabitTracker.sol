// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { FHE, euint32, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";

contract PrivateHabitTracker is ZamaEthereumConfig {

    struct Habit {
        euint32 encryptedHabitId;
        euint32 encryptedDailyGoal;
        uint256 currentStreak;
        uint256 longestStreak;
        uint256 totalCheckIns;
        uint256 lastCheckInDay;
        uint256 startDay;
        bool active;
        bool streakFrozen;
    }

    mapping(address => Habit) private habits;
    mapping(address => uint256) public publicStreak;

    uint256[] public milestones = [7, 30, 100, 365];
    mapping(address => mapping(uint256 => bool)) public milestoneEarned;

    event HabitRegistered(address indexed user, uint256 startDay);
    event CheckedIn(address indexed user, uint256 streak, uint256 day);
    event StreakBroken(address indexed user, uint256 previousStreak, uint256 day);
    event MilestoneReached(address indexed user, uint256 milestone);
    event HabitDeactivated(address indexed user, uint256 finalStreak);

    constructor() ZamaEthereumConfig() {}

    function registerHabit(
        externalEuint32 encryptedHabitId,
        externalEuint32 encryptedDailyGoal,
        bytes calldata inputProof
    ) external {
        require(!habits[msg.sender].active, "Habit already active. Deactivate first.");

        uint256 today = _today();

        euint32 habitId = FHE.fromExternal(encryptedHabitId, inputProof);
        euint32 dailyGoal = FHE.fromExternal(encryptedDailyGoal, inputProof);

        FHE.allow(habitId, msg.sender);
        FHE.allow(dailyGoal, msg.sender);
        FHE.allowThis(habitId);
        FHE.allowThis(dailyGoal);

        habits[msg.sender] = Habit({
            encryptedHabitId: habitId,
            encryptedDailyGoal: dailyGoal,
            currentStreak: 0,
            longestStreak: 0,
            totalCheckIns: 0,
            lastCheckInDay: 0,
            startDay: today,
            active: true,
            streakFrozen: false
        });

        publicStreak[msg.sender] = 0;
        emit HabitRegistered(msg.sender, today);
    }

    function checkIn() external {
        Habit storage habit = habits[msg.sender];
        require(habit.active, "No active habit. Register one first.");
        require(!habit.streakFrozen, "Streak is frozen. Unfreeze to continue.");

        uint256 today = _today();
        uint256 last = habit.lastCheckInDay;

        require(today > last, "Already checked in today.");

        if (last == 0 || today == last + 1) {
            habit.currentStreak += 1;
        } else {
            emit StreakBroken(msg.sender, habit.currentStreak, today);
            habit.currentStreak = 1;
        }

        if (habit.currentStreak > habit.longestStreak) {
            habit.longestStreak = habit.currentStreak;
        }

        habit.totalCheckIns += 1;
        habit.lastCheckInDay = today;
        publicStreak[msg.sender] = habit.currentStreak;

        emit CheckedIn(msg.sender, habit.currentStreak, today);
        _checkMilestones(msg.sender, habit.currentStreak);
    }

    function revealHabitTo(address to) external {
        Habit storage habit = habits[msg.sender];
        require(habit.active, "No active habit.");
        FHE.allow(habit.encryptedHabitId, to);
        FHE.allow(habit.encryptedDailyGoal, to);
    }

    function freezeStreak() external {
        require(habits[msg.sender].active, "No active habit.");
        require(!habits[msg.sender].streakFrozen, "Already frozen.");
        habits[msg.sender].streakFrozen = true;
    }

    function unfreezeStreak() external {
        require(habits[msg.sender].active, "No active habit.");
        require(habits[msg.sender].streakFrozen, "Not frozen.");
        habits[msg.sender].streakFrozen = false;
        habits[msg.sender].lastCheckInDay = _today();
    }

    function deactivateHabit() external {
        Habit storage habit = habits[msg.sender];
        require(habit.active, "No active habit.");
        uint256 finalStreak = habit.currentStreak;
        habit.active = false;
        emit HabitDeactivated(msg.sender, finalStreak);
    }

    function getPublicStats(address user) external view returns (
        uint256 currentStreak,
        uint256 longestStreak,
        uint256 totalCheckIns,
        uint256 startDay,
        uint256 lastCheckInDay,
        bool active,
        bool streakFrozen
    ) {
        Habit storage h = habits[user];
        return (
            h.currentStreak,
            h.longestStreak,
            h.totalCheckIns,
            h.startDay,
            h.lastCheckInDay,
            h.active,
            h.streakFrozen
        );
    }

    function getMilestonesEarned(address user) external view returns (bool[] memory) {
        bool[] memory earned = new bool[](milestones.length);
        for (uint256 i = 0; i < milestones.length; i++) {
            earned[i] = milestoneEarned[user][milestones[i]];
        }
        return earned;
    }

    function hasCheckedInToday(address user) external view returns (bool) {
        return habits[user].lastCheckInDay == _today();
    }

    function _today() internal view returns (uint256) {
        return block.timestamp / 1 days;
    }

    function _checkMilestones(address user, uint256 streak) internal {
        for (uint256 i = 0; i < milestones.length; i++) {
            uint256 m = milestones[i];
            if (streak >= m && !milestoneEarned[user][m]) {
                milestoneEarned[user][m] = true;
                emit MilestoneReached(user, m);
            }
        }
    }
}