import { createContext, useContext } from 'react';

// Signaal of de app in de desktop (systeem-layout) shell draait. Views kunnen dit
// lezen om later een desktop-variant te renderen zonder de mobiele render te raken.
const IsDesktopContext = createContext(false);

export function useIsDesktopContext() {
  return useContext(IsDesktopContext);
}

export default IsDesktopContext;
