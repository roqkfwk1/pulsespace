import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getChannels } from '../api/channel';
import { getWorkspaces } from '../api/workspace';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useWebSocket } from '../hooks/useWebSocket';
import TopNavBar from '../components/TopNavBar';
import ChannelTabBar from '../components/ChannelTabBar';
import ChannelSidebar from '../components/ChannelSidebar';
import ChatWindow from '../components/ChatWindow';
import MemberPanel from '../components/MemberPanel';
import { Menu as MenuIcon } from 'lucide-react';

export default function MainLayout() {
  const { wsId, chId } = useParams<{ wsId: string; chId?: string }>();
  const {
    setChannels,
    setCurrentWorkspace,
    setWorkspaces,
    currentWorkspace,
    channels,
    openTab,
    openTabs,
  } = useWorkspaceStore();
  const { send } = useWebSocket();
  const [showMembers, setShowMembers] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarFocused, setSidebarFocused] = useState(false);

  // Set workspace + workspace list
  useEffect(() => {
    if (!wsId) return;
    const id = Number(wsId);
    getWorkspaces().then((wsList) => {
      setWorkspaces(wsList);
      if (!currentWorkspace || currentWorkspace.id !== id) {
        const ws = wsList.find((w) => w.id === id);
        if (ws) setCurrentWorkspace(ws);
      }
    });
  }, [wsId, currentWorkspace, setCurrentWorkspace, setWorkspaces]);

  // Load channels
  useEffect(() => {
    if (!wsId) return;
    getChannels(Number(wsId)).then((chs) => {
      setChannels(chs);
    });
  }, [wsId, setChannels]);

  // Open initial tab from URL param or first channel
  useEffect(() => {
    if (channels.length === 0 || openTabs.length > 0) return;
    if (chId) {
      const ch = channels.find((c) => c.id === Number(chId));
      if (ch) openTab(ch);
    } else {
      openTab(channels[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, chId]);

  function handleAddTab() {
    setSidebarFocused(true);
    setSidebarOpen(true);
  }

  return (
    <div className="h-screen flex flex-col bg-base overflow-hidden">
      <TopNavBar />
      <ChannelTabBar onAddTab={handleAddTab} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => { setSidebarOpen((v) => !v); setSidebarFocused(false); }}
          className="md:hidden fixed bottom-24 left-4 z-50 p-3 bg-accent rounded-full text-white shadow-lg shadow-accent/30"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => { setSidebarOpen(false); setSidebarFocused(false); }}
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <div className={`
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 transition-transform duration-300 ease-out
          fixed md:relative z-40 h-[calc(100vh-5.5rem)]
          ${sidebarFocused ? 'ring-2 ring-accent/50' : ''}
        `}>
          <ChannelSidebar />
        </div>

        {/* Chat */}
        <ChatWindow
          onSend={send}
          onToggleMembers={() => setShowMembers((v) => !v)}
          showMembers={showMembers}
        />

        {/* Members panel */}
        <AnimatePresence>
          {showMembers && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden md:block overflow-hidden"
            >
              <MemberPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
