import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Code, Settings, MessageSquare, Save, Settings2, Smartphone, Copy, Check, Info } from 'lucide-react';

interface AgentConfig {
  systemPrompt: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  sender: string;
  received: string;
  reply: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'config' | 'setup' | 'logs'>('setup');
  const [config, setConfig] = useState<AgentConfig>({ systemPrompt: '' });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const webhookUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/api/webhook/message`;

  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error("Could not load config", err));
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      const loadLogs = () => {
        fetch('/api/logs')
          .then(res => res.json())
          .then(data => setLogs(data))
          .catch(err => console.error("Could not load logs", err));
      };
      loadLogs();
      const interval = setInterval(loadLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      // Optionally show a success toast here
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] font-sans text-slate-200 selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto p-6 lg:p-12">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Bot className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">iMessage AI Agent</h1>
              <p className="text-slate-500 text-sm">Automated replies powered by Gemini & iOS Shortcuts</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Nav */}
          <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 hide-scrollbar">
            <NavItem 
              active={activeTab === 'setup'} 
              onClick={() => setActiveTab('setup')} 
              icon={<Smartphone size={18} />} 
              label="iOS Connection" 
            />
            <NavItem 
              active={activeTab === 'config'} 
              onClick={() => setActiveTab('config')} 
              icon={<Settings2 size={18} />} 
              label="Agent Persona" 
            />
            <NavItem 
              active={activeTab === 'logs'} 
              onClick={() => setActiveTab('logs')} 
              icon={<MessageSquare size={18} />} 
              label="Activity Logs" 
            />
          </nav>

          {/* Main Content Pane */}
          <main className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {activeTab === 'setup' && (
                <SetupWizard webhookUrl={webhookUrl} copyToClipboard={copyToClipboard} copied={copied} />
              )}

              {activeTab === 'config' && (
                <motion.div
                  key="config"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#111112] border border-white/10 rounded-3xl p-8"
                >
                  <h2 className="text-xl font-medium text-white mb-6 flex items-center gap-3">
                    <Settings2 className="text-blue-500" /> Agent Persona
                  </h2>
                  <p className="text-slate-400 mb-8 max-w-2xl">
                    Define how your sidekick should talk. This system prompt is passed to the Gemini model to format every response. Include details about how to sound natural, use lowercase, or answer certain questions.
                  </p>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">
                      System Instructions
                    </label>
                    <textarea
                      value={config.systemPrompt}
                      onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
                      className="w-full h-64 bg-[#0A0A0B] border border-white/10 rounded-2xl p-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-mono text-sm leading-relaxed shadow-inner"
                      placeholder="You are my smart text message assistant..."
                    />
                    
                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={handleSaveConfig}
                        className="bg-blue-600 text-white hover:bg-blue-500 font-medium px-6 py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
                      >
                        {saving ? (
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                            <Code size={18} />
                          </motion.div>
                        ) : (
                          <Save size={18} />
                        )}
                        {saving ? 'Saving...' : 'Save Configuration'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'logs' && (
                <motion.div
                  key="logs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#111112] border border-white/10 rounded-3xl p-8 min-h-[500px]"
                >
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-medium text-white flex items-center gap-3">
                      <MessageSquare className="text-blue-500" /> Activity Logs
                    </h2>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      Live Feed
                    </div>
                  </div>

                  {logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <MessageSquare size={48} className="text-slate-800 mb-4" />
                      <p className="text-slate-400 font-medium">No messages yet.</p>
                      <p className="text-slate-500 text-sm max-w-sm mt-2">When your setup is complete, incoming messages and AI replies will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {logs.map((log) => (
                        <div key={log.id} className="bg-[#1A1A1C] border border-white/5 rounded-2xl p-5">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-[10px] font-bold text-slate-300 uppercase px-3 py-1 bg-white/5 border border-white/10 rounded-full tracking-wider">{log.sender}</span>
                            <span className="text-[10px] font-mono text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="flex gap-4">
                              <div className="w-1 bg-[#111112] border border-white/5 rounded-full"></div>
                              <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-600 mb-1">Received</p>
                                <p className="text-slate-300 text-sm">{log.received}</p>
                              </div>
                            </div>
                            
                            <div className="flex gap-4">
                              <div className="w-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                              <div className="flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-tighter text-blue-400 mb-1">Agent Replied</p>
                                <p className="text-white text-sm">{log.reply}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl lg:w-full transition-all text-left whitespace-nowrap text-sm font-medium
        ${active ? 'bg-blue-600/10 border border-blue-500/20 text-blue-300' : 'text-slate-400 hover:bg-white/5 border border-transparent'}
      `}
    >
      {icon}
      {label}
    </button>
  );
}

function SetupWizard({ webhookUrl, copyToClipboard, copied }: { webhookUrl: string, copyToClipboard: () => void, copied: boolean }) {
  const [step, setStep] = useState(1);
  const totalSteps = 5;

  return (
    <motion.div
      key="setup"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="bg-[#111112] border border-white/10 rounded-3xl p-8 pb-10"
    >
      <h2 className="text-xl font-medium mb-2 flex items-center gap-3 text-white">
        <Smartphone className="text-blue-500" /> Connecting to your iPhone
      </h2>
      <p className="text-slate-400 mb-8 leading-relaxed max-w-2xl text-sm">
        Apple restricts apps from reading iMessages, so the cloud can't do it automatically. We have to use your iPhone's <strong className="text-slate-200">Shortcuts app</strong>. Let's build it step by step.
      </p>

      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-white/5 -z-10 rounded-full transform -translate-y-1/2"></div>
        <div className="absolute top-1/2 left-0 h-1 bg-blue-500 -z-10 rounded-full transform -translate-y-1/2 transition-all duration-300" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}></div>
        {[1, 2, 3, 4, 5].map((s) => (
          <button 
            key={s} 
            onClick={() => setStep(s)}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all border-2 ${step === s ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : step > s ? 'bg-blue-900/50 border-blue-500/50 text-blue-300' : 'bg-[#111112] border-white/10 text-slate-500 hover:border-white/30'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="min-h-[350px]">
        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-3">
              <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">1</span> 
              Create the Trigger
            </h3>
            <p className="text-slate-400">First, we tell your iPhone to listen for new text messages.</p>
            <ul className="space-y-3 text-slate-300 ml-2">
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Open the <strong>Shortcuts</strong> app on your iPhone.</li>
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Tap <strong>Automation</strong> at the bottom, then tap the <strong>+</strong> at the top right.</li>
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Tap <strong>Message</strong>.</li>
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Important: Change it to <strong>Run Immediately</strong> (so it doesn't ask before running).</li>
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Tap <strong>Next</strong>, then tap <strong>New Blank Automation</strong>.</li>
            </ul>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-3">
              <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">2</span> 
              Connect to this App
            </h3>
            <p className="text-slate-400">Next, tell the shortcut to send the incoming text here.</p>
            
            <div className="bg-[#1A1A1C] p-5 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between mb-3 text-sm text-slate-300">
                <span>Your Webhook URL (Copy this)</span>
                <button onClick={copyToClipboard} className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium bg-blue-500/10 px-3 py-1 rounded-lg">
                  {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <code className="text-sm text-blue-400 break-all select-all block bg-[#0A0A0B]/50 border border-white/5 p-4 rounded-xl font-mono">
                {webhookUrl}
              </code>
            </div>

            <ul className="space-y-3 text-slate-300 ml-2">
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> At the bottom search bar, search for <strong>Get contents of URL</strong> and tap to add it.</li>
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Paste your copied URL into the URL field.</li>
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Tap the little blue <strong className="text-blue-400 font-bold">&gt;</strong> next to the URL to expand the settings.</li>
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Change <strong>Method</strong> from GET to <strong>POST</strong>.</li>
            </ul>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-3">
              <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">3</span> 
              Send the Message Payload
            </h3>
            <p className="text-slate-400">Still inside the "Get Contents of URL" block, scroll down to <strong>Request Body</strong>.</p>
            
            <ul className="space-y-4 text-slate-300 ml-2 mb-4">
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Ensure <strong>Request Body</strong> says <strong>JSON</strong>.</li>
              <li className="flex items-start gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> Tap <strong>Add new field</strong> -{'>'} <strong>Text</strong>.</li>
            </ul>

            <div className="bg-[#1C1C1E] border border-white/5 rounded-2xl p-4 shadow-lg mx-auto max-w-sm mb-6">
              <div className="flex justify-between items-center text-sm mb-4 border-b border-white/5 pb-3">
                <span className="text-white font-medium">Request Body</span>
                <span className="text-blue-500">JSON</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-black/20 rounded-lg p-2 border border-white/5 text-sm text-slate-300 flex items-center justify-between">
                    message
                    <span className="text-slate-600 text-xs">Text</span>
                  </div>
                  <div className="flex-1 bg-[#1A4B8B]/40 border border-[#1A4B8B] rounded-lg p-1.5 flex items-center justify-center shadow-inner">
                    <span className="text-blue-400 font-medium text-xs break-words drop-shadow-md">
                      Shortcut Input
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-black/20 rounded-lg p-2 border border-white/5 text-sm text-slate-300 flex items-center justify-between">
                    sender
                    <span className="text-slate-600 text-xs">Text</span>
                  </div>
                  <div className="flex-1 bg-[#1A4B8B]/40 border border-[#1A4B8B] rounded-lg p-1.5 flex items-center justify-center shadow-inner">
                     <span className="text-blue-400 font-medium text-xs break-words drop-shadow-md">
                      Sender
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-[#1A1A1C] p-4 rounded-xl border border-white/5">
                <div className="font-mono text-sm text-blue-400 mb-2">Key: <span className="text-white">message</span></div>
                <div className="text-sm text-slate-400">
                  Type <strong className="text-white">message</strong> on the left side (Key). On the right side, tap the empty space, choose <strong>Select Magic Variable</strong>, then scroll all the way to the top and tap <strong>Shortcut Input</strong>.
                </div>
              </div>
              <div className="bg-[#1A1A1C] p-4 rounded-xl border border-white/5">
                <div className="font-mono text-sm text-blue-400 mb-2">Key: <span className="text-white">sender</span></div>
                <div className="text-sm text-slate-400">
                  Type <strong className="text-white">sender</strong> on the left side. Right side = <strong>Shortcut Input</strong> again. AFTER inserting it, tap the blue variable block, and change its type to <strong>Sender</strong>.
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-3">
              <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">4</span> 
              Extract the AI's Reply
            </h3>
            <p className="text-slate-400">This app will process the message and return a JSON reply. Let's pull it out of the JSON.</p>
            
            <ul className="space-y-4 text-slate-300 ml-2">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> 
                <div>
                  Search the bottom bar and add <strong>Get Dictionary from Input</strong>.<br/>
                  <span className="text-xs text-slate-500 block mt-1">If it doesn't automatically say "from Contents of URL", tap the variable and select Magic Variable -{'>'} Contents of URL.</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> 
                <div>
                  Search the bottom bar and add <strong>Get Dictionary Value</strong>.<br/>
                  <span className="text-xs text-slate-500 block mt-1">Fill in the key: <code className="text-blue-400 font-mono bg-blue-500/10 px-1 rounded">reply</code> (all lowercase). Make sure it says getting value from <strong>Dictionary</strong>.</span>
                </div>
              </li>
            </ul>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <h3 className="text-lg font-medium text-white flex items-center gap-3">
              <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">5</span> 
              Send the Final Message
            </h3>
            <p className="text-slate-400">Finally, tell your iPhone to actually text the reply back.</p>
            
            <ul className="space-y-4 text-slate-300 ml-2 mb-6">
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 animate-pulse"></div> 
                <div>
                  Search and add the <strong>Send Message</strong> action.<br/>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> 
                <div>
                  <strong>The Message:</strong> Tap the message field, choose Magic Variable, and select <strong>Dictionary Value</strong>.<br/>
                  <span className="text-xs text-slate-500 block mt-1">(If it's empty, it will throw a "What's the message?" error).</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> 
                <div>
                  <strong>The Recipient:</strong> Tap Recipient, choose Magic Variable, tap <strong>Shortcut Input</strong> at the very top. Tap that bubble and change it to <strong>Sender</strong>.<br/>
                  <span className="text-xs text-slate-500 block mt-1">(If you get "invalid recipient", change the Sender property to Phone Number or Email).</span>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0"></div> 
                <div>
                  Turn <strong>off</strong> "Show When Run". Tap Done. You are finished!
                </div>
              </li>
            </ul>
          </motion.div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6 pt-6 border-t border-white/5">
        <button 
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="px-4 py-2 rounded-xl text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
        >
          Back
        </button>
        {step < totalSteps ? (
          <button 
            onClick={() => setStep(Math.min(totalSteps, step + 1))}
            className="px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            Next Step
          </button>
        ) : (
          <button 
            className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-500/20 transition-all"
          >
            All Done!
          </button>
        )}
      </div>
    </motion.div>
  );
}
