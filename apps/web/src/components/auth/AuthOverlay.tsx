import React from "react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import AuthModal from "./AuthModal";

type Props = { children: React.ReactNode };

/**
 * Renders your page normally, but if the user is NOT signed in,
 * shows a centered auth card as a modal overlay on top.
 */
const AuthOverlay: React.FC<Props> = ({ children }) => {
  const { user, loading } = useSupabaseAuth();

  return (
    <div className="relative">
      {/* Underlying page (still visible) */}
      {children}

      {/* Overlay when unauthenticated */}
      {!loading && !user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <AuthModal />
        </div>
      )}
    </div>
  );
};

export default AuthOverlay;
