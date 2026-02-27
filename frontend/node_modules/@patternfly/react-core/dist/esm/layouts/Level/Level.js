import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/layouts/Level/level.mjs';
export const Level = (_a) => {
    var { hasGutter, className = '', children = null } = _a, props = __rest(_a, ["hasGutter", "className", "children"]);
    return (_jsx("div", Object.assign({}, props, { className: css(styles.level, hasGutter && styles.modifiers.gutter, className), children: children })));
};
Level.displayName = 'Level';
//# sourceMappingURL=Level.js.map