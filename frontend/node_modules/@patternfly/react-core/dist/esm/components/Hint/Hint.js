import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Hint/hint.mjs';
import { css } from '@patternfly/react-styles';
export const Hint = (_a) => {
    var { children, className, actions, hasNoActionsOffset = false } = _a, props = __rest(_a, ["children", "className", "actions", "hasNoActionsOffset"]);
    return (_jsxs("div", Object.assign({ className: css(styles.hint, className) }, props, { children: [actions && (_jsx("div", { className: css(styles.hintActions, hasNoActionsOffset && styles.modifiers.noOffset), children: actions })), children] })));
};
Hint.displayName = 'Hint';
//# sourceMappingURL=Hint.js.map