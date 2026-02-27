"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopoverContent = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const popover_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Popover/popover"));
const react_styles_1 = require("@patternfly/react-styles");
const PopoverContent = (_a) => {
    var { className = null, children } = _a, props = tslib_1.__rest(_a, ["className", "children"]);
    return ((0, jsx_runtime_1.jsx)("div", Object.assign({ className: (0, react_styles_1.css)(popover_1.default.popoverContent, className) }, props, { children: children })));
};
exports.PopoverContent = PopoverContent;
exports.PopoverContent.displayName = 'PopoverContent';
//# sourceMappingURL=PopoverContent.js.map