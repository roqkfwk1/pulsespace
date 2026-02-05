import { Fragment } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';
import {
  ChevronDown,
  Search,
  Bell,
  Settings,
  LogOut,
  Sun,
  Moon,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useThemeStore } from '../stores/themeStore';

export default function TopNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { currentWorkspace, workspaces } = useWorkspaceStore();
  const { theme, toggleTheme } = useThemeStore();

  const isWorkspacePage = location.pathname === '/workspaces';

  function handleLogout() {
    logout();
    navigate('/');
  }

  function switchWorkspace(wsId: number) {
    navigate(`/workspaces/${wsId}`);
  }

  return (
    <header className="h-12 border-b border-line bg-surface sticky top-0 z-50 shrink-0">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Workspace switcher */}
        <div className="flex items-center gap-2">
          {currentWorkspace && !isWorkspacePage ? (
            <Menu as="div" className="relative">
              <MenuButton className="flex items-center gap-2 px-2 py-1.5 hover:bg-elevated rounded-lg transition-colors">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
                  style={{
                    background: `linear-gradient(135deg, ${currentWorkspace.colorStart ?? '#14b8a6'}, ${currentWorkspace.colorEnd ?? '#06b6d4'})`,
                  }}
                >
                  {currentWorkspace.icon ? (
                    <span className="text-sm">{currentWorkspace.icon}</span>
                  ) : (
                    <span className="text-xs font-bold text-white">{currentWorkspace.name.charAt(0)}</span>
                  )}
                </div>
                <span className="font-semibold text-primary text-sm">
                  {currentWorkspace.name}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted" />
              </MenuButton>

              <Transition
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-100"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <MenuItems className="absolute left-0 mt-1 w-60 bg-surface rounded-xl border border-line shadow-lg p-1.5 z-50 outline-none">
                  {workspaces.map((ws) => (
                    <MenuItem key={ws.id}>
                      <button
                        onClick={() => switchWorkspace(ws.id)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-secondary data-[focus]:bg-accent-light data-[focus]:text-accent transition-colors flex items-center gap-2.5"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: `linear-gradient(135deg, ${ws.colorStart ?? '#14b8a6'}, ${ws.colorEnd ?? '#06b6d4'})`,
                          }}
                        >
                          {ws.icon ? (
                            <span className="text-sm">{ws.icon}</span>
                          ) : (
                            <span className="text-[10px] font-bold text-white">{ws.name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{ws.name}</p>
                          {ws.description && (
                            <p className="text-[11px] text-muted truncate">{ws.description}</p>
                          )}
                        </div>
                      </button>
                    </MenuItem>
                  ))}
                  <div className="border-t border-line my-1" />
                  <MenuItem>
                    <button
                      onClick={() => navigate('/workspaces')}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-muted data-[focus]:bg-elevated transition-colors"
                    >
                      모든 워크스페이스 보기
                    </button>
                  </MenuItem>
                </MenuItems>
              </Transition>
            </Menu>
          ) : (
            <div className="flex items-center gap-2 px-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-sm bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                pulsespace
              </span>
            </div>
          )}
        </div>

        {/* Center: Search */}
        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-base border border-line rounded-lg text-sm text-muted hover:border-accent/50 transition-colors min-w-[240px]">
          <Search className="w-4 h-4" />
          <span>검색...</span>
          <kbd className="ml-auto px-1.5 py-0.5 text-[10px] bg-elevated rounded border border-line font-mono">⌘K</kbd>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <button className="relative p-2 text-secondary hover:text-primary hover:bg-elevated rounded-lg transition-colors">
            <Bell className="w-[18px] h-[18px]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
          </button>

          <button
            onClick={toggleTheme}
            className="p-2 text-secondary hover:text-primary hover:bg-elevated rounded-lg transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>

          <Menu as="div" className="relative">
            <MenuButton className="flex items-center p-1 hover:bg-elevated rounded-lg transition-colors">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {user?.name?.charAt(0) ?? '?'}
                </span>
              </div>
            </MenuButton>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-150"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-100"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <MenuItems className="absolute right-0 mt-1 w-52 bg-surface rounded-xl border border-line shadow-lg p-1.5 z-50 outline-none">
                <div className="px-3 py-2 border-b border-line mb-1">
                  <p className="text-sm font-medium text-primary">{user?.name}</p>
                  <p className="text-xs text-muted">{user?.email}</p>
                </div>
                <MenuItem>
                  <button className="w-full text-left px-3 py-2 rounded-lg text-sm text-secondary data-[focus]:bg-elevated transition-colors flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    설정
                  </button>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-danger data-[focus]:bg-danger/10 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </button>
                </MenuItem>
              </MenuItems>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
}
