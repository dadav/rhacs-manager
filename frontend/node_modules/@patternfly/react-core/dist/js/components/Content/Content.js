"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Content = exports.ContentVariants = void 0;
const tslib_1 = require("tslib");
const jsx_runtime_1 = require("react/jsx-runtime");
const react_styles_1 = require("@patternfly/react-styles");
const content_1 = tslib_1.__importDefault(require("@patternfly/react-styles/css/components/Content/content"));
const helpers_1 = require("../../helpers");
var ContentVariants;
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
})(ContentVariants || (exports.ContentVariants = ContentVariants = {}));
const componentStyles = {
    div: content_1.default.content,
    h1: content_1.default.contentH1,
    h2: content_1.default.contentH2,
    h3: content_1.default.contentH3,
    h4: content_1.default.contentH4,
    h5: content_1.default.contentH5,
    h6: content_1.default.contentH6,
    p: content_1.default.contentP,
    a: content_1.default.contentA,
    small: content_1.default.contentSmall,
    blockquote: content_1.default.contentBlockquote,
    pre: content_1.default.contentPre,
    hr: content_1.default.contentHr,
    ul: content_1.default.contentUl,
    ol: content_1.default.contentOl,
    dl: content_1.default.contentDl,
    li: content_1.default.contentLi,
    dt: content_1.default.contentDt,
    dd: content_1.default.contentDd
};
const Content = (_a) => {
    var { children, className = '', component, isPlainList = false, isVisitedLink = false, ouiaId, ouiaSafe = true, isEditorial = false } = _a, props = tslib_1.__rest(_a, ["children", "className", "component", "isPlainList", "isVisitedLink", "ouiaId", "ouiaSafe", "isEditorial"]);
    const wrappingComponent = component !== null && component !== void 0 ? component : 'div';
    const Component = wrappingComponent;
    const ouiaProps = (0, helpers_1.useOUIAProps)(exports.Content.displayName, ouiaId, ouiaSafe);
    const isList = ['ul', 'ol', 'dl'].includes(wrappingComponent);
    return ((0, jsx_runtime_1.jsx)(Component, Object.assign({}, ouiaProps, props, { "data-pf-content": true, className: (0, react_styles_1.css)(componentStyles[wrappingComponent], isList && isPlainList && content_1.default.modifiers.plain, isVisitedLink && content_1.default.modifiers.visited, isEditorial && content_1.default.modifiers.editorial, className), children: children })));
};
exports.Content = Content;
exports.Content.displayName = 'Content';
//# sourceMappingURL=Content.js.map