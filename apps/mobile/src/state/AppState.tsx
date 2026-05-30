import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, Dispatch, PropsWithChildren, useContext, useEffect, useMemo, useReducer, useState } from "react";
import { AppAction, appReducer, AppState, initialAppState } from "./appStateModel";

type AppStateContextValue = {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  hydrated: boolean;
};

const storageKey = "finsight-demo-state-v1";
const AppStateContext = createContext<AppStateContextValue | null>(null);

export function AppStateProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(storageKey)
      .then((value) => {
        if (!active || !value) return;
        dispatch({ type: "hydrate", state: JSON.parse(value) as AppState });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrated(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(storageKey, JSON.stringify(state)).catch(() => undefined);
  }, [hydrated, state]);

  const value = useMemo(() => ({ state, dispatch, hydrated }), [state, hydrated]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppStateContext);
  if (!value) {
    throw new Error("useAppState must be used inside AppStateProvider.");
  }

  return value;
}
