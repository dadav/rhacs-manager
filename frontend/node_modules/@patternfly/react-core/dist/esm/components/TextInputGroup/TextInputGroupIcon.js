import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/TextInputGroup/text-input-group.mjs';
import { css } from '@patternfly/react-styles';
export const TextInputGroupIcon = (_a) => {
    var { children, className, isStatus } = _a, props = __rest(_a, ["children", "className", "isStatus"]);
    return (_jsx("span", Object.assign({ className: css(styles.textInputGroupIcon, isStatus && styles.modifiers.status, className) }, props, { children: children })));
};
TextInputGroupIcon.displayName = 'TextInputGroupIcon';
//# sourceMappingURL=TextInputGroupIcon.js.map