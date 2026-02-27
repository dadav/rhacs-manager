import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/DescriptionList/description-list.mjs';
import { css } from '@patternfly/react-styles';
export const DescriptionListTerm = (_a) => {
    var { children, className, icon } = _a, props = __rest(_a, ["children", "className", "icon"]);
    return (_jsxs("dt", Object.assign({ className: css(styles.descriptionListTerm, className) }, props, { children: [icon ? _jsx("span", { className: css(styles.descriptionListTermIcon), children: icon }) : null, _jsx("span", { className: css(styles.descriptionListText), children: children })] })));
};
DescriptionListTerm.displayName = 'DescriptionListTerm';
//# sourceMappingURL=DescriptionListTerm.js.map