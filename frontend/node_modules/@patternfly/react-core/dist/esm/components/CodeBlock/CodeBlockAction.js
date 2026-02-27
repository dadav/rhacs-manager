import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/CodeBlock/code-block.mjs';
export const CodeBlockAction = (_a) => {
    var { children = null, className } = _a, props = __rest(_a, ["children", "className"]);
    return (_jsx("div", Object.assign({ className: css(`${styles.codeBlockActions}-item`, className) }, props, { children: children })));
};
CodeBlockAction.displayName = 'CodeBlockAction';
//# sourceMappingURL=CodeBlockAction.js.map