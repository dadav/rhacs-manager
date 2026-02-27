import { createContext } from 'react';
export const TabsContext = createContext({
    variant: 'default',
    mountOnEnter: false,
    unmountOnExit: false,
    localActiveKey: '',
    uniqueId: '',
    setAccentStyles: () => null,
    handleTabClick: () => null,
    handleTabClose: undefined
});
export const TabsContextProvider = TabsContext.Provider;
export const TabsContextConsumer = TabsContext.Consumer;
//# sourceMappingURL=TabsContext.js.map