"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopoverFooter = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const popover_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Popover/popover"));
const react_styles_1 = require("@patternfly/react-styles");
const PopoverFooter = (_a) => {
    var { children, className = '' } = _a, props = tslib_1.__rest(_a, ["children", "className"]);
    return ((0, jsx_runtime_1.jsx)("footer", Object.assign({ className: (0, react_styles_1.css)(popover_1.default.popoverFooter, className) }, props, { children: children })));
};
exports.PopoverFooter = PopoverFooter;
exports.PopoverFooter.displayName = 'PopoverFooter';
//# sourceMappingURL=PopoverFooter.js.map