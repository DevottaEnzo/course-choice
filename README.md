# Course Choice

A clickable mockup of a GUA course finder for students, styled after globaluniversityacademy.org.

**Flow:** choose a location → see courses there (on site and online) → open a course for details, the diplomas it stacks into, and who to contact.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8765
```

Then go to http://localhost:8765.

## Files

- `data.js`: locations, courses, stackable diplomas and contacts. Edit this file to change the content.
- `app.js`: hash-based router and page templates (`#/location/azraq`, `#/course/C02`, `#/degree/health`, `#/diplomas`, `#/contact`).
- `styles.css`: the GUA-style look (Helvetica, black-on-white, grey-green boxes, dark footer).

## Mockup content

Course titles, partners, sites, languages, accreditation and levels come from `GUA_Course_List.xlsx`. Descriptions, credits, dates, the five stackable qualifications, learner quotes and contacts are invented. All people and `@gua-courses.example` addresses are fictional.
