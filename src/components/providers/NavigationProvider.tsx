import {createContext} from "preact";
import {useState, useEffect} from "preact/hooks";

interface NavigationContextType {
    fromDashboard: boolean;
    goBack: () => void;
}

export const NavigationContext = createContext<NavigationContextType>({
    fromDashboard: false,
    goBack: () => {
    },
});

export default function NavigationProvider({children}: { children: preact.ComponentChildren }) {
    const [fromDashboard, setFromDashboard] = useState(false);

    useEffect(() => {
        // Check history state for a flag indicating navigation from the dashboard
        if (window.history.state && window.history.state.fromDashboard) {
            setFromDashboard(true);
        }
    }, []);

    const goBack = () => window.history.back();

    return (
        <NavigationContext.Provider value={{fromDashboard, goBack}}>
            {children}
        </NavigationContext.Provider>
    );
}
