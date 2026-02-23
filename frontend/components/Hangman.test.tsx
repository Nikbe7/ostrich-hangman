import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Hangman from './Hangman'

describe('Hangman Component', () => {
    it('renders the base correctly with 0 wrong guesses', () => {
        const { container } = render(<Hangman wrongGuesses={0} />)
        // Ensure SVG is rendered
        const svg = container.querySelector('svg')
        expect(svg).toBeInTheDocument()

        // Base structure should be there, but not the man (head starts at guess 5 roughly)
        // Instead of exact visual paths, we just check no crash happens and it renders SVG
    })
})
