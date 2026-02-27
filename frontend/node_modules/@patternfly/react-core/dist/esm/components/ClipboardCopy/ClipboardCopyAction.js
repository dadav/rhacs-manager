import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/ClipboardCopy/clipboard-copy.mjs';
import { css } from '@patternfly/react-styles';
export const ClipboardCopyAction = (_a) => {
    var { children = null, className = '' } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("span", Object.assign({ className: css(styles.clipboardCopyActionsItem, className) }, props, { children: children })));
};
ClipboardCopyAction.displayName = 'ClipboardCopyAction';
//# sourceMappingURL=ClipboardCopyAction.js.map