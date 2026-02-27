import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Card/card.mjs';
export const CardActions = (_a) => {
    var { children, className, hasNoOffset = false } = _a, props = __rest(_a, ["children", "className", "hasNoOffset"]);
    return (_jsx("div", Object.assign({ className: css(styles.cardActions, hasNoOffset && styles.modifiers.noOffset, className) }, props, { children: children })));
};
CardActions.displayName = 'CardActions';
//# sourceMappingURL=CardActions.js.map