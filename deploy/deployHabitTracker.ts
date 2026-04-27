import { ethers } from "hardhat";

async function main() {
  console.log("Deploying PrivateHabitTracker...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  const HabitTracker = await ethers.getContractFactory("PrivateHabitTracker");
  const habitTracker = await HabitTracker.deploy();

  await habitTracker.waitForDeployment();

  const address = await habitTracker.getAddress();
  console.log("PrivateHabitTracker deployed to:", address);
  console.log("Save this address — you'll need it for the frontend!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });