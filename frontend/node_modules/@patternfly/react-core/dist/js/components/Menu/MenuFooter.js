"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuFooter = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Menu/menu"));
const react_styles_1 = require("@patternfly/react-styles");
const MenuFooter = (_a) => {
    var { children, className = '' } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({}, props, { className: (0, react_styles_1.css)(menu_1.default.menuFooter, className), children: children })));
};
exports.MenuFooter = MenuFooter;
exports.MenuFooter.displayName = 'MenuFooter';
//# sourceMappingURL=MenuFooter.js.map