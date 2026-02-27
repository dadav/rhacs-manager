import { __rest } from "tslib";
import { jsx as _jsx } from "react/jsx-runtime";
import styles from '@patternfly/react-styles/css/components/Skeleton/skeleton.mjs';
import { css } from '@patternfly/react-styles';
import cssHeight from '@patternfly/react-tokens/dist/esm/c_skeleton_Height';
import cssWidth from '@patternfly/react-tokens/dist/esm/c_skeleton_Width';
export const Skeleton = (_a) => {
    var { className, width, height, fontSize, shape, screenreaderText } = _a, props = __rest(_a, ["className", "width", "height", "fontSize", "shape", "screenreaderText"]);
    const fontHeightClassName = fontSize
        ? Object.values(styles.modifiers).find((key) => key === `pf-m-text-${fontSize}`)
        : undefined;
    return (_jsx("div", Object.assign({}, props, { className: css(styles.skeleton, fontSize && fontHeightClassName, shape === 'circle' && styles.modifiers.circle, shape === 'square' && styles.modifiers.square, className) }, ((width || height) && {
        style: Object.assign({ [cssWidth.name]: width ? width : undefined, [cssHeight.name]: height ? height : undefined }, props.style)
    }), { children: _jsx("span", { className: "pf-v6-screen-reader", children: screenreaderText }) })));
};
Skeleton.displayName = 'Skeleton';
//# sourceMappingURL=Skeleton.js.map