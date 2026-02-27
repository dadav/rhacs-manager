"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TabsContextConsumer = exports.TabsContextProvider = exports.TabsContext = void 0;
const react_1 = require("react");
exports.TabsContext = (0, react_1.createContext)({
    variant: 'default',
    mountOnEnter: false,
    unmountOnExit: false,
    localActiveKey: '',
    uniqueId: '',
    setAccentStyles: () => null,
    handleTabClick: () => null,
    handleTabClose: undefined
});
exports.TabsContextProvider = exports.TabsContext.Provider;
exports.TabsContextConsumer = exports.TabsContext.Consumer;
//# sourceMappingURL=TabsContext.js.map