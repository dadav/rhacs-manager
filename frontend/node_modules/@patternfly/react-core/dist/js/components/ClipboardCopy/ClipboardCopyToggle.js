"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipboardCopyToggle = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const clipboard_copy_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/ClipboardCopy/clipboard-copy"));
const react_styles_1 = require("@patternfly/react-styles");
const angle_right_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/angle-right-icon'));
const Button_1 = require("../Button");
const ClipboardCopyToggle = (_a) => {
    var { onClick, id, contentId, isExpanded = false } = _a, props = tslib_1.__rest(_a, ["onClick", "id", "contentId", "isExpanded"]);
    return ((0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ type: "button", variant: "control", onClick: onClick, id: id, "aria-controls": isExpanded ? contentId : undefined, "aria-expanded": isExpanded }, props, { icon: (0, jsx_runtime_1.jsx)("div", { className: (0, react_styles_1.css)(clipboard_copy_1.default.clipboardCopyToggleIcon), children: (0, jsx_runtime_1.jsx)(angle_right_icon_1.default, {}) }) })));
};
exports.ClipboardCopyToggle = ClipboardCopyToggle;
exports.ClipboardCopyToggle.displayName = 'ClipboardCopyToggle';
//# sourceMappingURL=ClipboardCopyToggle.js.map