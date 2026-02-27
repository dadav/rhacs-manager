"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DrawerSection = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const drawer_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Drawer/drawer"));
const react_styles_1 = require("@patternfly/react-styles");
const Drawer_1 = require("./Drawer");
const DrawerSection = (_a) => {
    var { className = '', children, colorVariant = Drawer_1.DrawerColorVariant.default } = _a, props = tslib_1.__rest(_a, ["className", "children", "colorVariant"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(drawer_1.default.drawerSection, colorVariant === Drawer_1.DrawerColorVariant.noBackground && drawer_1.default.modifiers.noBackground, colorVariant === Drawer_1.DrawerColorVariant.secondary && drawer_1.default.modifiers.secondary, className) }, props, { children: children })));
};
exports.DrawerSection = DrawerSection;
exports.DrawerSection.displayName = 'DrawerSection';
//# sourceMappingURL=DrawerSection.js.map