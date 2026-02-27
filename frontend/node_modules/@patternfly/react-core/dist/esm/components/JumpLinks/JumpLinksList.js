import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/JumpLinks/jump-links.mjs';
export const JumpLinksList = (_a) => {
    var { children, className } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("ul", Object.assign({ className: css(styles.jumpLinksList, className), role: "list" }, props, { children: children })));
};
JumpLinksList.displayName = 'JumpLinksList';
//# sourceMappingURL=JumpLinksList.js.map