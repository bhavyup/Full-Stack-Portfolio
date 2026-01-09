import React, { useState, useRef } from "react";
import {
  Bell,
  Check,
  InfoIcon,
  MessageSquare,
  PencilRuler,
  ShieldAlert,
  ShieldBan,
  SquareCheckBig,
  UserPlus,
  Trash2,
  BellRing,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const notificationConfig = {
  message: { icon: MessageSquare, color: "text-purple-400" },
  update: { icon: PencilRuler, color: "text-yellow-400" },
  user: { icon: UserPlus, color: "text-blue-400" },
  security: { icon: ShieldAlert, color: "text-red-400" },
  success: { icon: SquareCheckBig, color: "text-green-400" },
  error: { icon: ShieldBan, color: "text-red-600" },
  info: { icon: InfoIcon, color: "text-slate-400" },
  create: { icon: UserPlus, color: "text-green-400" },
  delete: { icon: Trash2, color: "text-red-400" },
  default: { icon: Bell, color: "text-slate-400" },
};

const NotificationPanel = ({
  unreadNotifCount,
  notifications = [],
  onBellClick = () => {},
  onClearAll = () => {},
  onMarkAllAsRead = () => {},
  onNotificationClick = () => {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const openTimeoutRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  const handleOpen = () => {
    clearTimeout(closeTimeoutRef.current);
    setIsOpen(true);
    onBellClick(); // Fetch notifications when opened
  };

  const handleClose = () => {
    clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), 200);
  };

  const handleDelayedOpen = () => {
    clearTimeout(closeTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
      onBellClick(); // Trigger on hover open too
    }, 500);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        asChild
        onMouseEnter={handleDelayedOpen}
        onMouseLeave={handleClose}
        onClick={handleOpen}
      >
        <div className="relative group cursor-pointer">
          <Bell className={`h-6 w-6 ${isOpen ? "text-cyan-400" : "text-slate-300"} group-hover:text-cyan-400 transition duration-300`} />
          {unreadNotifCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-white shadow-md">
              {unreadNotifCount}
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75"></span>
            </span>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        onMouseEnter={handleOpen}
        onMouseLeave={handleClose}
        align="end"
        className="w-[950px] border border-slate-700 rounded-xl shadow-xl text-white p-0 bg-slate-800 focus:outline-none focus:ring-0 focus-visible:ring-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between rounded-xl px-4 py-2 bg-slate-800">
          <div className="flex text-lg text-purple-400">
            <BellRing className="w-5 h-5 mt-1 mr-1 -ml-1 animate-pulse" />
            Notifications
          </div>
          <button 
            onClick={onClearAll}
            className="text-xs rounded-md text-red-400 bg-slate-800/40 hover:bg-slate-700 hover:text-red-300 flex items-center gap-1 focus:outline-none focus:ring-0 focus-visible:ring-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear all Notifications
          </button>
        </div>

        {/* Notification List */}
        <div className="max-h-[600px] overflow-y-auto bg-slate-900 custom-scrollbar">
          {notifications.length > 0 ? (
            notifications.map((notif) => {
              const config = notificationConfig[notif.type] || notificationConfig.default;
              const Icon = config.icon;
              return (
                <div
                  key={notif.id}
                  className="bg-slate-900 hover:bg-slate-800/80 transition-colors px-4 py-2 gap-2 flex items-start rounded-md relative cursor-pointer"
                  onClick={() => onNotificationClick(notif.id)}
                >
                  <Icon className={`mt-[2px] h-4 w-4 shrink-0 ${config.color}`} />
                  <div className="flex justify-between w-full">
                    <span className="text-sm text-white">{notif.message}</span>
                    {notif.createdAt && (
                      <span className="text-xs text-slate-400 mt-0.5">
                        {new Date(notif.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                  {!notif.read && (
                    <span className="absolute top-1 right-2 flex h-4 w-4 items-center justify-center rounded-full text-white">
                      <div className="w-2 h-2 rounded-full bg-red-400 animate-ping"></div>
                    </span>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-slate-400 px-4 py-3 text-sm">
              No new notifications
            </div>
          )}
        </div>

        {/* Footer Button */}
        <div className="w-full h-10 m-0 p-0 bg-slate-800/40 hover:bg-slate-900/40 transition-colors">
          <Button
            
            size="sm"
            className="text-xs h-full w-full rounded-xl text-green-400 hover:text-green-300 bg-slate-800/40 hover:bg-slate-900/40 transition-colors"
            onClick={onMarkAllAsRead}
          >
            <Check className="w-3 h-3 mr-1" />
            Mark all as read
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};



export default NotificationPanel;
