import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontSize: {
				'hero': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
				'hero-mobile': ['2.5rem', { lineHeight: '1.2', letterSpacing: '-0.02em' }],
			},
			lineHeight: {
				'relaxed-plus': '1.75',
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					variant: 'hsl(var(--primary-variant))',
					light: 'hsl(var(--primary-light))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))',
					soft: {
						DEFAULT: 'hsl(var(--destructive-soft))',
						foreground: 'hsl(var(--destructive-soft-foreground))'
					}
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				'warning-soft': {
					DEFAULT: 'hsl(var(--warning-soft))',
					foreground: 'hsl(var(--warning-soft-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
				},
				/* Taxonomy hues for categories that carry no status meaning */
				category: {
					1: 'hsl(var(--category-1))',
					'1-foreground': 'hsl(var(--category-1-foreground))',
					2: 'hsl(var(--category-2))',
					'2-foreground': 'hsl(var(--category-2-foreground))',
					3: 'hsl(var(--category-3))',
					'3-foreground': 'hsl(var(--category-3-foreground))',
					4: 'hsl(var(--category-4))',
					'4-foreground': 'hsl(var(--category-4-foreground))',
					5: 'hsl(var(--category-5))',
					'5-foreground': 'hsl(var(--category-5-foreground))',
					6: 'hsl(var(--category-6))',
					'6-foreground': 'hsl(var(--category-6-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					light: 'hsl(var(--accent-light))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				achievement: {
					surface: 'hsl(var(--achievement-surface))',
					raised: 'hsl(var(--achievement-surface-raised))',
					accent: 'hsl(var(--achievement-accent))',
					'accent-foreground': 'hsl(var(--achievement-accent-foreground))',
					'accent-soft': 'hsl(var(--achievement-accent-soft))',
					foreground: 'hsl(var(--achievement-foreground))',
					muted: 'hsl(var(--achievement-muted))',
					border: 'hsl(var(--achievement-border))',
					track: 'hsl(var(--achievement-track))'
				}
			},
			fontFamily: {
				sans: ['Manrope', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
				display: ['Sora', 'Manrope', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
				'achievement-display': ['Sora', 'Manrope', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
			},
			transitionDuration: {
				achievement: '180ms',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
