import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/TabContent/tab-content.mjs';
export const TabContentBody = (_a) => {
    var { children, className, hasPadding } = _a, props = __rest(_a, ["children", "className", "hasPadding"]);
    return (_jsx("div", Object.assign({ className: css(styles.tabContentBody, hasPadding && styles.modifiers.padding, className) }, props, { children: children })));
};
TabContentBody.displayName = 'TabContentBody';
//# sourceMappingURL=TabContentBody.js.map