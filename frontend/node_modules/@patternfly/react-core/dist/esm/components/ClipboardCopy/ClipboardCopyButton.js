import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { createRef } from 'react';
import CopyIcon from '@patternfly/react-icons/dist/esm/icons/copy-icon';
import { Button } from '../Button';
import { Tooltip } from '../Tooltip';
export const ClipboardCopyButton = (_a) => {
    var { onClick, exitDelay = 0, entryDelay = 300, maxWidth = '100px', position = 'top', 'aria-label': ariaLabel = 'Copyable input', id, children, variant = 'control', onTooltipHidden = () => { }, className, hasNoPadding = false } = _a, props = __rest(_a, ["onClick", "exitDelay", "entryDelay", "maxWidth", "position", 'aria-label', "id", "children", "variant", "onTooltipHidden", "className", "hasNoPadding"]);
    const triggerRef = createRef();
    return (_jsx(Tooltip, { trigger: "mouseenter focus click", triggerRef: triggerRef, exitDelay: exitDelay, entryDelay: entryDelay, maxWidth: maxWidth, position: position, "aria-live": "polite", aria: "none", content: _jsx("div", { children: children }), onTooltipHidden: onTooltipHidden, children: _jsx(Button, Object.assign({ type: "button", variant: variant, hasNoPadding: hasNoPadding, onClick: onClick, "aria-label": ariaLabel, className: className, id: id, icon: _jsx(CopyIcon, {}) }, props, { ref: triggerRef })) }));
};
ClipboardCopyButton.displayName = 'ClipboardCopyButton';
//# sourceMappingURL=ClipboardCopyButton.js.map