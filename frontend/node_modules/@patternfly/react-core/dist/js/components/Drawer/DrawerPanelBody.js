"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawerPanelBody = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const drawer_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Drawer/drawer"));
const react_styles_1 = require("@patternfly/react-styles");
const DrawerPanelBody = (_a) => {
    var { className = '', children, hasNoPadding = false } = _a, props = tslib_1.__rest(_a, ["className", "children", "hasNoPadding"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(drawer_1.default.drawerBody, hasNoPadding && drawer_1.default.modifiers.noPadding, className) }, props, { children: children })));
};
exports.DrawerPanelBody = DrawerPanelBody;
exports.DrawerPanelBody.displayName = 'DrawerPanelBody';
//# sourceMappingURL=DrawerPanelBody.js.map