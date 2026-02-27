import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Card/card.mjs';
import { css } from '@patternfly/react-styles';
import { CardContext } from './Card';
export const CardExpandableContent = (_a) => {
    var { children, className } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx(CardContext.Consumer, { children: ({ isExpanded }) => isExpanded ? (_jsx("div", Object.assign({ className: css(styles.cardExpandableContent, className) }, props, { children: children }))) : null }));
};
CardExpandableContent.displayName = 'CardExpandableContent';
//# sourceMappingURL=CardExpandableContent.js.map