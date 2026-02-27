import { __rest } from "tslib";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/EmptyState/empty-state.mjs';
import { EmptyStateIcon } from './EmptyStateIcon';
export var EmptyStateHeadingLevel;
(function (EmptyStateHeadingLevel) {
    EmptyStateHeadingLevel["h1"] = "h1";
    EmptyStateHeadingLevel["h2"] = "h2";
    EmptyStateHeadingLevel["h3"] = "h3";
    EmptyStateHeadingLevel["h4"] = "h4";
    EmptyStateHeadingLevel["h5"] = "h5";
    EmptyStateHeadingLevel["h6"] = "h6";
})(EmptyStateHeadingLevel || (EmptyStateHeadingLevel = {}));
export const EmptyStateHeader = (_a) => {
    var { className, titleClassName, titleText, headingLevel: HeadingLevel = EmptyStateHeadingLevel.h1, icon: Icon } = _a, props = __rest(_a, ["className", "titleClassName", "titleText", "headingLevel", "icon"]);
    return (_jsxs("div", Object.assign({ className: css(`${styles.emptyState}__header`, className) }, props, { children: [Icon && _jsx(EmptyStateIcon, { icon: Icon }), titleText && (_jsx("div", { className: css(`${styles.emptyState}__title`), children: _jsx(HeadingLevel, { className: css(styles.emptyStateTitleText, titleClassName), children: titleText }) }))] })));
};
EmptyStateHeader.displayName = 'EmptyStateHeader';
//# sourceMappingURL=EmptyStateHeader.js.map