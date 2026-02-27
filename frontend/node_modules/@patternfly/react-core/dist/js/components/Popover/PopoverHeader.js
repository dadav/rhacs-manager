"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PopoverHeader = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const popover_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Popover/popover"));
const PopoverHeaderIcon_1 = require("./PopoverHeaderIcon");
const PopoverHeaderText_1 = require("./PopoverHeaderText");
const PopoverHeader = (_a) => {
    var { children, icon, className, titleHeadingLevel = 'h6', alertSeverityVariant, id, alertSeverityScreenReaderText } = _a, props = tslib_1.__rest(_a, ["children", "icon", "className", "titleHeadingLevel", "alertSeverityVariant", "id", "alertSeverityScreenReaderText"]);
    return ((0, jsx_runtime_1.jsx)("header", Object.assign({ className: (0, react_styles_1.css)(popover_1.default.popoverHeader, className) }, props, { children: (0, jsx_runtime_1.jsxs)("div", { className: (0, react_styles_1.css)(popover_1.default.popoverTitle), id: id, children: [icon && (0, jsx_runtime_1.jsx)(PopoverHeaderIcon_1.PopoverHeaderIcon, { children: icon }), (0, jsx_runtime_1.jsxs)(PopoverHeaderText_1.PopoverHeaderText, { headingLevel: titleHeadingLevel, children: [alertSeverityVariant && alertSeverityScreenReaderText && ((0, jsx_runtime_1.jsx)("span", { className: "pf-v6-screen-reader", children: alertSeverityScreenReaderText })), children] })] }) })));
};
exports.PopoverHeader = PopoverHeader;
exports.PopoverHeader.displayName = 'PopoverHeader';
//# sourceMappingURL=PopoverHeader.js.map