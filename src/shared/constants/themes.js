import glassmorphic from '../../assets/scss/themes/theme.glassmorphic.scss?url';

export const THEME_CONFIG = {
    system: {
        cssFile: glassmorphic,
        isDark: 'system',
        name: 'System'
    },
    light: {
        cssFile: glassmorphic,
        isDark: false,
        name: 'Light'
    },
    dark: {
        cssFile: glassmorphic,
        isDark: true,
        name: 'Dark'
    }
};
