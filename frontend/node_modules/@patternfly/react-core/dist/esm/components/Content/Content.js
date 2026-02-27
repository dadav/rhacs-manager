import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import { css } from '@patternfly/react-styles';
import styles from '@patternfly/react-styles/css/components/Content/content.mjs';
import { useOUIAProps } from '../../helpers';
export var ContentVariants;
(function (ContentVariants) {
    ContentVariants["h1"] = "h1";
    ContentVariants["h2"] = "h2";
    ContentVariants["h3"] = "h3";
    ContentVariants["h4"] = "h4";
    ContentVariants["h5"] = "h5";
    ContentVariants["h6"] = "h6";
    ContentVariants["p"] = "p";
    ContentVariants["a"] = "a";
    ContentVariants["small"] = "small";
    ContentVariants["blockquote"] = "blockquote";
    ContentVariants["pre"] = "pre";
    ContentVariants["hr"] = "hr";
    ContentVariants["ul"] = "ul";
    ContentVariants["ol"] = "ol";
    ContentVariants["dl"] = "dl";
    ContentVariants["li"] = "li";
    ContentVariants["dt"] = "dt";
    ContentVariants["dd"] = "dd";
})(ContentVariants || (ContentVariants = {}));
const componentStyles = {
    div: styles.content,
    h1: styles.contentH1,
    h2: styles.contentH2,
    h3: styles.contentH3,
    h4: styles.contentH4,
    h5: styles.contentH5,
    h6: styles.contentH6,
    p: styles.contentP,
    a: styles.contentA,
    small: styles.contentSmall,
    blockquote: styles.contentBlockquote,
    pre: styles.contentPre,
    hr: styles.contentHr,
    ul: styles.contentUl,
    ol: styles.contentOl,
    dl: styles.contentDl,
    li: styles.contentLi,
    dt: styles.contentDt,
    dd: styles.contentDd
};
export const Content = (_a) => {
    var { children, className = '', component, isPlainList = false, isVisitedLink = false, ouiaId, ouiaSafe = true, isEditorial = false } = _a, props = __rest(_a, ["children", "className", "component", "isPlainList", "isVisitedLink", "ouiaId", "ouiaSafe", "isEditorial"]);
    const wrappingComponent = component !== null && component !== void 0 ? component : 'div';
    const Component = wrappingComponent;
    const ouiaProps = useOUIAProps(Content.displayName, ouiaId, ouiaSafe);
    const isList = ['ul', 'ol', 'dl'].includes(wrappingComponent);
    return (_jsx(Component, Object.assign({}, ouiaProps, props, { "data-pf-content": true, className: css(componentStyles[wrappingComponent], isList && isPlainList && styles.modifiers.plain, isVisitedLink && styles.modifiers.visited, isEditorial && styles.modifiers.editorial, className), children: children })));
};
Content.displayName = 'Content';
//# sourceMappingURL=Content.js.map