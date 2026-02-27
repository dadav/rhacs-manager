"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Drawer = exports.DrawerContext = exports.DrawerColorVariant = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const drawer_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Drawer/drawer"));
const react_styles_1 = require("@patternfly/react-styles");
var DrawerColorVariant;
(function (DrawerColorVariant) {
    DrawerColorVariant["default"] = "default";
    DrawerColorVariant["secondary"] = "secondary";
    DrawerColorVariant["noBackground"] = "no-background";
})(DrawerColorVariant || (exports.DrawerColorVariant = DrawerColorVariant = {}));
exports.DrawerContext = (0, react_1.createContext)({
    isExpanded: false,
    isStatic: false,
    onExpand: () => { },
    position: 'end',
    drawerRef: null,
    drawerContentRef: null,
    isInline: false
});
const Drawer = (_a) => {
    var { className = '', children, isExpanded = false, isInline = false, isStatic = false, position = 'end', onExpand = () => { } } = _a, props = tslib_1.__rest(_a, ["className", "children", "isExpanded", "isInline", "isStatic", "position", "onExpand"]);
    const drawerRef = (0, react_1.useRef)(undefined);
    const drawerContentRef = (0, react_1.useRef)(undefined);
    return ((0, jsx_runtime_1.jsx)(exports.DrawerContext.Provider, { value: { isExpanded, isStatic, onExpand, position, drawerRef, drawerContentRef, isInline }, children: (0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(drawer_1.default.drawer, isExpanded && drawer_1.default.modifiers.expanded, isInline && drawer_1.default.modifiers.inline, isStatic && drawer_1.default.modifiers.static, (position === 'left' || position === 'start') && drawer_1.default.modifiers.panelLeft, position === 'bottom' && drawer_1.default.modifiers.panelBottom, className), ref: drawerRef }, props, { children: children })) }));
};
exports.Drawer = Drawer;
exports.Drawer.displayName = 'Drawer';
//# sourceMappingURL=Drawer.js.map