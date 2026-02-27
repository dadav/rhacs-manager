"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolbarExpandIconWrapper = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const toolbar_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Toolbar/toolbar"));
const react_styles_1 = require("@patternfly/react-styles");
const ToolbarExpandIconWrapper = (_a) => {
    var { children, className } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("span", Object.assign({}, props, { className: (0, react_styles_1.css)(toolbar_1.default.toolbarExpandAllIcon, className), children: children })));
};
exports.ToolbarExpandIconWrapper = ToolbarExpandIconWrapper;
exports.ToolbarExpandIconWrapper.displayName = 'ToolbarExpandIconWrapper';
//# sourceMappingURL=ToolbarExpandIconWrapper.js.map