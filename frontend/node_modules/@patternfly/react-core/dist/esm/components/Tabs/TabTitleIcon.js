import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Tabs/tabs.mjs';
export const TabTitleIcon = (_a) => {
    var { children, className = '' } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("span", Object.assign({ className: css(`${styles.tabs}__item-icon`, className) }, props, { children: children })));
};
TabTitleIcon.displayName = 'TabTitleIcon';
//# sourceMappingURL=TabTitleIcon.js.map