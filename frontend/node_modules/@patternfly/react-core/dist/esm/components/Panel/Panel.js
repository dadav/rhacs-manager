import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef } from 'react';
import styles from '@patternfly/react-styles/css/components/Panel/panel.mjs';
import { css } from '@patternfly/react-styles';
const PanelBase = (_a) => {
    var { className, children, variant, isScrollable, innerRef } = _a, props = __rest(_a, ["className", "children", "variant", "isScrollable", "innerRef"]);
    return (_jsx("div", Object.assign({ className: css(styles.panel, variant && styles.modifiers[variant], isScrollable && styles.modifiers.scrollable, className), ref: innerRef }, props, { children: children })));
};
export const Panel = forwardRef((props, ref) => _jsx(PanelBase, Object.assign({ innerRef: ref }, props)));
Panel.displayName = 'Panel';
//# sourceMappingURL=Panel.js.map