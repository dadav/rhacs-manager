"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawerPanelDescription = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const drawer_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Drawer/drawer"));
const react_styles_1 = require("@patternfly/react-styles");
const DrawerPanelDescription = (_a) => {
    var { className, children } = _a, props = tslib_1.__rest(_a, ["className", "children"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(drawer_1.default.drawerDescription, className) }, props, { children: children })));
};
exports.DrawerPanelDescription = DrawerPanelDescription;
exports.DrawerPanelDescription.displayName = 'DrawerPanelDescription';
//# sourceMappingURL=DrawerPanelDescription.js.map