# 🔒 Private Habit Tracker

Built on Zama FHEVM — your streak is public, your habit is yours.

## The Problem
On-chain habit trackers expose everything. Your habit, your goal, your streak — visible to anyone. That kills adoption for sensitive personal habits.

## The Solution
Private Habit Tracker uses Fully Homomorphic Encryption (FHE) to separate proof of consistency from disclosure of content. The blockchain verifies your streak. Nobody sees what you're tracking.

## How It Works
- User registers a habit — details encrypted, only visible to the owner
- Daily check-ins update a public streak counter on-chain
- Milestone badges (7, 30, 100, 365 days) awarded automatically
- Users can optionally reveal their habit to a specific address (coach, accountability partner)

## Tech Stack
- Smart contract: Solidity + Zama FHEVM
- Network: Ethereum Sepolia testnet
- Frontend: React + TypeScript + ethers.js
- Wallet: MetaMask Extension or Mobile

## Live Demo
[private-habit-tracker-beta.vercel.app](https://private-habit-tracker-beta.vercel.app)

## Contract Address
`0x28C4847A759ce2525aAc2c73B503f3f502587939`
