import { createContext } from 'react';
import { getBreakpoint, getVerticalBreakpoint } from '../../helpers/util';
export const pageContextDefaults = {
    isManagedSidebar: false,
    isSidebarOpen: false,
    onSidebarToggle: () => null,
    width: null,
    height: null,
    getBreakpoint,
    getVerticalBreakpoint
};
export const PageContext = createContext(pageContextDefaults);
export const PageContextProvider = PageContext.Provider;
export const PageContextConsumer = PageContext.Consumer;
//# sourceMappingURL=PageContext.js.map