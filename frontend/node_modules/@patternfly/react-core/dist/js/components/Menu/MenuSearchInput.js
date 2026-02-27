"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuSearchInput = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_styles_1 = require("@patternfly/react-styles");
const menu_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Menu/menu"));
exports.MenuSearchInput = (0, react_1.forwardRef)((props, ref) => (
// Update to use the styles object when core adds the class
(0, jsx_runtime_1.jsx)("div", Object.assign({}, props, { className: (0, react_styles_1.css)(`${menu_1.default.menuSearch}-input`, props.className), ref: ref }))));
exports.MenuSearchInput.displayName = 'MenuSearchInput';
//# sourceMappingURL=MenuSearchInput.js.map