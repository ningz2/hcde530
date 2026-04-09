# HCDE 530 Project Context

## Project Goal
Demonstrate how to process a CSV data file efficiently and clearly, with emphasis on the most important code sections for learning and discussion.

## Practitioner Profile
- Primary background: HCD / UX practice (not software engineering)
- Current role context: UX research / UX design
- Preferred code style: readable and explainable first

## Audience
- Mixed UX + data background classmates
- Assume varied coding comfort levels
- Explanations should be practical and jargon-light

## Week 2 Scope
- Focus on `Week 2/demo_responses.csv` only
- Optimize scripts and outputs for this file (not a general multi-week framework)
- Keep dependencies to Python standard library only

## Definition of "Efficient"
Efficiency in this project means all of the following:
- Clean and organized code structure
- Fast enough runtime for classroom demo data
- Low complexity / memory-conscious processing
- Fewer manual steps to run and interpret outputs

## Priority Technical Focus Areas
1. Counting words reliably
2. Cleaning text before analysis
3. Making outputs interpretable for non-engineers
4. Organizing code into clear, maintainable sections/functions

## Output Requirements
Use a combination of:
- Terminal summary for quick metrics and run feedback
- HTML dashboard for easy visual interpretation

## Preferred Explanation Depth
- Medium detail (function-level walkthrough of key logic, not line-by-line for everything)

## Data Quality and Error Handling Rules
- If rows are messy or incomplete, skip them with terminal warnings
- Continue processing valid rows instead of failing the whole run
- Make warning messages specific and actionable

## Required Terminal Metrics
Always include:
- Total responses processed
- Average words per response
- Median words per response
- Role-level breakdown

## Visual/UI Preference for Dashboard
- Simple and functional presentation
- Clear labels and straightforward layout over decorative styling

## Implementation Constraints
- Prefer beginner-friendly patterns over advanced abstractions
- Keep functions small and named by intent
- Avoid external libraries unless explicitly requested
- Preserve source CSV as-is unless explicitly asked to transform it

## File Placement
- This context file lives at `HCDE 530/PROJECT_CONTEXT.md` for easy discovery
