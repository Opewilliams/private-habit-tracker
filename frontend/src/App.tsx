import { useState } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x28C4847A759ce2525aAc2c73B503f3f502587939";

const ABI = [
  "function registerHabit() external",
  "function checkIn() external",
  "function freezeStreak() external",
  "function unfreezeStreak() external",
  "function deactivateHabit() external",
  "function getPublicStats(address user) external view returns (uint256, uint256, uint256, uint256, uint256, bool, bool)",
  "function getMilestonesEarned(address user) external view returns (bool[])",
  "function hasCheckedInToday(address user) external view returns (bool)",
];

const HABIT_SUGGESTIONS = [
  "🏋️ Exercise",
  "📚 Reading",
  "🧘 Meditation",
  "✍️ Writing",
  "💧 Hydration",
  "🙏 Prayer",
  "🏃 Running",
  "🎯 Deep Work",
];

const MILESTONE_LABELS = ["7 days", "30 days", "100 days", "365 days"];

export default function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [milestones, setMilestones] = useState<boolean[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [habitText, setHabitText] = useState("");

  async function connect() {
    const win = window as any;
    if (!win.ethereum) {
      alert("Please install MetaMask!");
      return;
    }
    await win.ethereum.request({ method: "eth_requestAccounts" });
    
    try {
      await win.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }],
      });
    } catch (e: any) {
      if (e.code === 4902) {
        await win.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0xaa36a7",
            chainName: "Sepolia",
            rpcUrls: ["https://rpc.sepolia.org"],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
      }
    }

    const prov = new ethers.BrowserProvider(win.ethereum);
    const signer = await prov.getSigner();
    const addr = await signer.getAddress();
    const ct = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
    setAccount(addr);
    setContract(ct);
    await loadStats(ct, addr);
  }


  async function loadStats(ct: any, addr: string) {
    try {
      const s = await ct.getPublicStats(addr);
      setStats({
        currentStreak: Number(s[0]),
        longestStreak: Number(s[1]),
        totalCheckIns: Number(s[2]),
        active: s[5],
        frozen: s[6],
      });
      const m = await ct.getMilestonesEarned(addr);
      setMilestones(m);
      const checked = await ct.hasCheckedInToday(addr);
      setCheckedInToday(checked);
    } catch (e) {
      console.error(e);
    }
  }

  async function checkIn() {
    setLoading(true);
    setMessage("");
    try {
      const tx = await contract.checkIn();
      await tx.wait();
      setMessage("✅ Checked in! Streak updated.");
      await loadStats(contract, account);
    } catch (e: any) {
      setMessage("❌ " + (e.reason || e.message));
    }
    setLoading(false);
  }

  async function freeze() {
    setLoading(true);
    try {
      const tx = await contract.freezeStreak();
      await tx.wait();
      setMessage("🧊 Streak frozen.");
      await loadStats(contract, account);
    } catch (e: any) {
      setMessage("❌ " + (e.reason || e.message));
    }
    setLoading(false);
  }

  async function unfreeze() {
    setLoading(true);
    try {
      const tx = await contract.unfreezeStreak();
      await tx.wait();
      setMessage("🔥 Streak unfrozen.");
      await loadStats(contract, account);
    } catch (e: any) {
      setMessage("❌ " + (e.reason || e.message));
    }
    setLoading(false);
  }

  // Store habit locally — encryption happens on-chain via FHEVM
  // For testnet demo, we save the label in localStorage only
  async function commitHabit() {
    if (!habitText.trim()) {
      setMessage("❌ Please enter or select a habit first.");
      return;
    }
    setLoading(true);
    setMessage("Registering on-chain...");
    try {
      const tx = await contract.registerHabit();
      await tx.wait();
      localStorage.setItem("habit_" + account, habitText);
      setMessage("✅ Habit registered!");
      setShowRegister(false);
      await loadStats(contract, account);
    } catch (e: any) {
      setMessage("❌ " + (e.reason || e.message));
    }
    setLoading(false);
  }

  const savedHabit = account
    ? localStorage.getItem("habit_" + account)
    : null;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🔒 Private Habit Tracker</h1>
      <p style={styles.subtitle}>
        Your streak is public. Your habit is yours.
      </p>

      {!account ? (
        <button style={styles.button} onClick={connect}>
          Connect Wallet
        </button>
      ) : (
        <div style={styles.card}>
          <p style={styles.address}>
            {account.slice(0, 6)}...{account.slice(-4)}
          </p>

          {stats && stats.active ? (
            <>
              {savedHabit && (
                <div style={styles.habitBadge}>
                  🔒 Tracking: <strong>{savedHabit}</strong>
                  <span style={{ color: "#555", fontSize: 11, display: "block", marginTop: 4 }}>
                    Only visible on this device
                  </span>
                </div>
              )}

              <div style={styles.streakBox}>
                <div style={styles.streakNumber}>{stats.currentStreak}</div>
                <div style={styles.streakLabel}>day streak 🔥</div>
              </div>

              <div style={styles.statsRow}>
                <div style={styles.stat}>
                  <div style={styles.statNum}>{stats.longestStreak}</div>
                  <div style={styles.statLabel}>Longest</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statNum}>{stats.totalCheckIns}</div>
                  <div style={styles.statLabel}>Total Check-ins</div>
                </div>
              </div>

              {stats.frozen && (
                <div style={styles.frozenBadge}>🧊 Streak Frozen</div>
              )}

              <div style={styles.milestones}>
                {MILESTONE_LABELS.map((label, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.milestone,
                      opacity: milestones[i] ? 1 : 0.3,
                    }}
                  >
                    {milestones[i] ? "🏆" : "🔒"} {label}
                  </div>
                ))}
              </div>

              <div style={styles.actions}>
                <button
                  style={{
                    ...styles.button,
                    opacity: checkedInToday || loading ? 0.5 : 1,
                  }}
                  onClick={checkIn}
                  disabled={checkedInToday || loading}
                >
                  {loading ? "Processing..." : checkedInToday ? "✅ Done Today" : "Check In Today"}
                </button>

                {!stats.frozen ? (
                  <button style={styles.ghostButton} onClick={freeze}>
                    🧊 Freeze Streak
                  </button>
                ) : (
                  <button style={styles.ghostButton} onClick={unfreeze}>
                    🔥 Unfreeze
                  </button>
                )}
              </div>
            </>
          ) : showRegister ? (
            <div style={styles.registerBox}>
              <h3 style={{ marginBottom: 8, color: "#fff" }}>
                What habit will you track?
              </h3>
              <p style={{ color: "#666", fontSize: 13, marginBottom: 16 }}>
                This stays on your device only. The blockchain just sees your streak.
              </p>

              <input
                style={styles.input}
                type="text"
                placeholder="Type your habit e.g. Read 20 pages"
                value={habitText}
                onChange={(e) => setHabitText(e.target.value)}
              />

              <p style={{ color: "#555", fontSize: 12, marginBottom: 12 }}>
                Or pick a suggestion:
              </p>

              <div style={styles.habitGrid}>
                {HABIT_SUGGESTIONS.map((h) => (
                  <button
                    key={h}
                    style={{
                      ...styles.habitOption,
                      border:
                        habitText === h
                          ? "2px solid #ff6b35"
                          : "2px solid #333",
                    }}
                    onClick={() => setHabitText(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>

              <button
                style={styles.button}
                onClick={commitHabit}
              >
                Start Tracking
              </button>

              <button
                style={{ ...styles.ghostButton, marginTop: 8 }}
                onClick={() => setShowRegister(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div style={styles.noHabit}>
              <p style={{ marginBottom: 16 }}>No active habit yet.</p>
              <button
                style={styles.button}
                onClick={() => setShowRegister(true)}
              >
                + Register a Habit
              </button>
            </div>
          )}

          {message && <p style={styles.message}>{message}</p>}
        </div>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: "100vh",
    background: "#0f0f0f",
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "sans-serif",
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  subtitle: { color: "#888", marginBottom: 32, fontSize: 14 },
  card: {
    background: "#1a1a1a",
    borderRadius: 16,
    padding: 32,
    width: "100%",
    maxWidth: 420,
    textAlign: "center",
  },
  address: { color: "#555", fontSize: 12, marginBottom: 16 },
  habitBadge: {
    background: "#1a1a2e",
    border: "1px solid #333",
    borderRadius: 10,
    padding: "10px 16px",
    fontSize: 13,
    color: "#aaa",
    marginBottom: 20,
  },
  streakBox: { marginBottom: 24 },
  streakNumber: { fontSize: 72, fontWeight: 900, color: "#ff6b35" },
  streakLabel: { fontSize: 16, color: "#888" },
  statsRow: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  stat: { textAlign: "center" },
  statNum: { fontSize: 28, fontWeight: 700 },
  statLabel: { fontSize: 12, color: "#888" },
  milestones: {
    display: "flex",
    justifyContent: "space-around",
    marginBottom: 24,
    flexWrap: "wrap",
    gap: 8,
  },
  milestone: { fontSize: 12, color: "#aaa" },
  actions: { display: "flex", flexDirection: "column", gap: 12 },
  button: {
    background: "#ff6b35",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "14px 24px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
  },
  ghostButton: {
    background: "transparent",
    color: "#888",
    border: "1px solid #333",
    borderRadius: 12,
    padding: "12px 24px",
    fontSize: 14,
    cursor: "pointer",
    width: "100%",
  },
  frozenBadge: {
    background: "#1e3a5f",
    color: "#7eb8f7",
    borderRadius: 8,
    padding: "8px 16px",
    marginBottom: 16,
    fontSize: 14,
  },
  noHabit: { color: "#888", padding: 24 },
  registerBox: { textAlign: "left" },
  habitGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 8,
    marginBottom: 16,
  },
  habitOption: {
    background: "#222",
    color: "#fff",
    borderRadius: 10,
    padding: "12px 8px",
    fontSize: 13,
    cursor: "pointer",
  },
  input: {
    width: "100%",
    background: "#222",
    border: "1px solid #444",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    fontSize: 14,
    marginBottom: 12,
    boxSizing: "border-box",
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    color: "#aaa",
    textAlign: "center",
  },
};
