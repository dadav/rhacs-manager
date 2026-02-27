import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/DescriptionList/description-list.mjs';
import { css } from '@patternfly/react-styles';
export const DescriptionListDescription = (_a) => {
    var { children = null, className } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("dd", Object.assign({ className: css(styles.descriptionListDescription, className) }, props, { children: _jsx("div", { className: css(styles.descriptionListText), children: children }) })));
};
DescriptionListDescription.displayName = 'DescriptionListDescription';
//# sourceMappingURL=DescriptionListDescription.js.map