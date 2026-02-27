"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipboardCopyButton = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const copy_icon_1 = tslib_1.__importDefault(require('@patternfly/react-icons/dist/js/icons/copy-icon'));
const Button_1 = require("../Button");
const Tooltip_1 = require("../Tooltip");
const ClipboardCopyButton = (_a) => {
    var { onClick, exitDelay = 0, entryDelay = 300, maxWidth = '100px', position = 'top', 'aria-label': ariaLabel = 'Copyable input', id, children, variant = 'control', onTooltipHidden = () => { }, className, hasNoPadding = false } = _a, props = tslib_1.__rest(_a, ["onClick", "exitDelay", "entryDelay", "maxWidth", "position", 'aria-label', "id", "children", "variant", "onTooltipHidden", "className", "hasNoPadding"]);
    const triggerRef = (0, react_1.createRef)();
    return ((0, jsx_runtime_1.jsx)(Tooltip_1.Tooltip, { trigger: "mouseenter focus click", triggerRef: triggerRef, exitDelay: exitDelay, entryDelay: entryDelay, maxWidth: maxWidth, position: position, "aria-live": "polite", aria: "none", content: (0, jsx_runtime_1.jsx)("div", { children: children }), onTooltipHidden: onTooltipHidden, children: (0, jsx_runtime_1.jsx)(Button_1.Button, Object.assign({ type: "button", variant: variant, hasNoPadding: hasNoPadding, onClick: onClick, "aria-label": ariaLabel, className: className, id: id, icon: (0, jsx_runtime_1.jsx)(copy_icon_1.default, {}) }, props, { ref: triggerRef })) }));
};
exports.ClipboardCopyButton = ClipboardCopyButton;
exports.ClipboardCopyButton.displayName = 'ClipboardCopyButton';
//# sourceMappingURL=ClipboardCopyButton.js.map