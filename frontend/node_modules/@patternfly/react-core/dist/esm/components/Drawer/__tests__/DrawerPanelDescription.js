import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import { DrawerPanelDescription } from '../DrawerPanelDescription';
import styles from '@patternfly/react-styles/css/components/Drawer/drawer.mjs';
import '@testing-library/jest-dom';
test(`Renders with only class ${styles.drawerDescription} by default`, () => {
    render(_jsx(DrawerPanelDescription, { children: "description content" }));
    expect(screen.getByText('description content')).toHaveClass(styles.drawerDescription, { exact: true });
});
test(`Renders with custom class when className is passed`, () => {
    render(_jsx(DrawerPanelDescription, { className: "test-class", children: "description content" }));
    expect(screen.getByText('description content')).toHaveClass('test-class');
});
test(`Spreads props`, () => {
    render(_jsx(DrawerPanelDescription, { id: "test-id", children: "description content" }));
    expect(screen.getByText('description content')).toHaveAttribute('id', 'test-id');
});
test(`Matches snapshot`, () => {
    const { asFragment } = render(_jsx(DrawerPanelDescription, { children: "description content" }));
    expect(asFragment()).toMatchSnapshot();
});
//# sourceMappingURL=DrawerPanelDescription.js.map