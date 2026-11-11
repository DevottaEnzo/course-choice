(function () {
  "use strict";
  const D = window.GUA;
  const main = document.getElementById("main");

  /* ---------- helpers ---------- */
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const loc = (id) => D.locations.find((l) => l.id === id);
  const degree = (id) => D.degrees.find((d) => d.id === id);
  const fromQ = (locId) => (locId ? `?from=${encodeURIComponent(locId)}` : "");

  /** Courses available at a location: on-site ones first, then online-everywhere ones. */
  function coursesAt(locId) {
    const onSite = D.offerings[locId] || [];
    const online = D.onlineEverywhere.filter((c) => !onSite.includes(c));
    return [...onSite.map((id) => ({ id, online: false })), ...online.map((id) => ({ id, online: true }))];
  }
  const availableIds = (locId) => new Set(coursesAt(locId).map((c) => c.id));

  /** Locations where a course is offered on site. */
  function locationsFor(courseId) {
    return D.locations.filter((l) => (D.offerings[l.id] || []).includes(courseId));
  }

  /** Diplomas a course counts towards. */
  const degreesFor = (courseId) => D.degrees.filter((d) => d.core.includes(courseId) || d.electives.includes(courseId));

  function degreeAvailability(d, locId) {
    const avail = availableIds(locId);
    const coreAvail = d.core.filter((c) => avail.has(c));
    const coreEcts = d.core.reduce((s, c) => s + D.courses[c].ects, 0);
    const coreAvailEcts = coreAvail.reduce((s, c) => s + D.courses[c].ects, 0);
    const electAvailEcts = d.electives.filter((c) => avail.has(c)).reduce((s, c) => s + D.courses[c].ects, 0);
    const reachable = Math.min(d.ects, coreAvailEcts + Math.min(electAvailEcts, d.electiveEcts));
    return { coreAvail: coreAvail.length, coreTotal: d.core.length, coreEcts, reachable, complete: reachable >= d.ects };
  }

  function tags(c, online) {
    const t = [];
    if (online) t.push(`<span class="tag online">Online</span>`);
    t.push(`<span class="tag">${esc(c.level)}</span>`);
    if (c.accreditation === "Accredited") t.push(`<span class="tag fill">Accredited</span>`);
    t.push(`<span class="tag">${esc(c.languages.join(" · "))}</span>`);
    t.push(`<span class="tag">${c.ects} ECTS</span>`);
    return t.join("");
  }

  function courseItem(id, online, locId) {
    const c = D.courses[id];
    return `<li class="course-item"><a href="#/course/${id}${fromQ(locId)}">
      <h3>${esc(c.title)}</h3>
      <span class="arrow" aria-hidden="true">→</span>
      <p>${esc(c.summary)}</p>
      <div class="meta">${tags(c, online)}</div>
    </a></li>`;
  }

  function contactBlock(contactId) {
    const p = D.contacts[contactId];
    return `<div class="contact-card">
      <p class="who">${esc(p.name)}</p>
      <p>${esc(p.role)}</p>
      <p><a href="mailto:${esc(p.email)}">${esc(p.email)}</a></p>
      <p class="muted">${esc(p.hours)}</p>
    </div>`;
  }

  function crumbs(parts) {
    return `<nav class="crumbs" aria-label="Breadcrumb">` +
      parts.map((p, i) => (i < parts.length - 1 ? `<a href="${p[1]}">${esc(p[0])}</a><span aria-hidden="true">›</span>` : `<span aria-current="page">${esc(p[0])}</span>`)).join("") +
      `</nav>`;
  }

  /* Abstract "street art" mural standing in for the GUA hero photo. */
  function mural() {
    const colours = ["#b3341f", "#e3a72f", "#2f6f8f", "#4c8c4a", "#d96a8b", "#f2efe6", "#6a4c93", "#1f1f1f"];
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    let shapes = "";
    for (let i = 0; i < 46; i++) {
      const x = rnd() * 1600, y = rnd() * 500, r = 30 + rnd() * 140, col = colours[Math.floor(rnd() * colours.length)];
      shapes += rnd() > 0.5
        ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${col}" opacity="0.9"/>`
        : `<rect x="${x}" y="${y}" width="${r * 1.6}" height="${r}" fill="${col}" opacity="0.85" transform="rotate(${rnd() * 40 - 20} ${x} ${y})"/>`;
    }
    for (let i = 0; i < 10; i++) {
      shapes += `<path d="M${rnd() * 1600} ${rnd() * 500} q ${rnd() * 300 - 150} ${rnd() * 300 - 150} ${rnd() * 400} ${rnd() * 100}" stroke="#fff" stroke-width="${4 + rnd() * 8}" fill="none" stroke-linecap="round"/>`;
    }
    return `<svg viewBox="0 0 1600 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="1600" height="500" fill="#3a3a3a"/>${shapes}</svg>`;
  }

  /* ---------- views ---------- */
  function viewHome() {
    const byRegion = {};
    D.locations.forEach((l) => {
      byRegion[l.region] ??= {};
      (byRegion[l.region][l.country] ??= []).push(l);
    });
    const regionOrder = ["Middle East", "Eastern Africa", "Southern Africa", "West Africa", "Central Africa", "South Asia", "South-East Asia"];

    const regions = regionOrder.filter((r) => byRegion[r]).map((r) => `
      <div class="region">
        <h2 class="rule">${esc(r)}</h2>
        <div class="country-grid">
          ${Object.entries(byRegion[r]).map(([country, sites]) => `
            <div class="country">
              <h3>${esc(country)}</h3>
              <ul class="site-links">
                ${sites.map((s) => `<li><a href="#/location/${s.id}"><span class="site-name">${esc(s.name)}</span><span class="count">${coursesAt(s.id).length} courses</span></a></li>`).join("")}
              </ul>
            </div>`).join("")}
        </div>
      </div>`).join("");

    return `
      <div class="hero" role="img" aria-label="Colourful street-art wall reading Education for all">${mural()}<div class="hero-tag">Education for all</div></div>
      <section><div class="wrap">
        <h1>Find a course</h1>
        <p class="lead">The Global University Academy brings university courses to refugees, displaced people and host communities in ${new Set(D.locations.map((l) => l.country)).size} countries. Start with where you are, and we will show you what you can study there, how courses build into a one-year diploma, and who can help you apply.</p>
      </div></section>
      <section><div class="wrap">
        <div class="steps">
          <div class="step"><b>1</b>Choose your location</div>
          <div class="step"><b>2</b>Pick a course that fits your goals</div>
          <div class="step"><b>3</b>Stack courses into a diploma and contact your coordinator</div>
        </div>
      </div></section>
      <section><div class="wrap">
        <h2 class="rule" id="locations">Where are you studying?</h2>
        <p class="muted" style="margin-top:-8px;margin-bottom:32px">Online preparation courses are open at every location.</p>
        ${regions}
      </div></section>
      <section><div class="wrap">
        <div class="callout">
          <div><h2>Not sure where to start?</h2><p>Most learners begin with the Foundation Certificate. Every credit counts towards a diploma.</p></div>
          <a class="btn" href="#/degree/foundation">See the Foundation Certificate</a>
        </div>
      </div></section>`;
  }

  function viewLocation(id) {
    const l = loc(id);
    if (!l) return notFound();
    const list = coursesAt(id);
    const onSite = list.filter((c) => !c.online);
    const online = list.filter((c) => c.online);

    const dips = D.degrees.map((d) => {
      const a = degreeAvailability(d, id);
      const pct = Math.round((a.reachable / d.ects) * 100);
      return `<a class="dip-card" href="#/degree/${d.id}${fromQ(id)}" style="background:${d.colour}">
        <p class="eyebrow">${esc(d.type)} · ${d.ects} ECTS</p>
        <h3>${esc(d.title)}</h3>
        <div class="progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
        <p>${a.complete ? "You can complete this here." : `${a.reachable} of ${d.ects} credits available here.`}</p>
        <div class="foot"><span>${a.coreAvail}/${a.coreTotal} core courses here</span><span>→</span></div>
      </a>`;
    }).join("");

    return `
      <div class="page-hero"><div class="wrap">
        ${crumbs([["Find a course", "#/"], [l.country, "#/#locations"], [l.name]])}
        <p class="eyebrow">${esc(l.country)} · ${esc(l.region)}</p>
        <h1>Courses in ${esc(l.name)}</h1>
        <p class="lead">${esc(l.blurb)}</p>
      </div></div>
      <section><div class="wrap two-col">
        <div>
          <h2 class="rule">At the ${esc(l.name)} hub</h2>
          ${onSite.length ? `<ul class="course-list">${onSite.map((c) => courseItem(c.id, false, id)).join("")}</ul>` : `<p class="empty">No on-site courses this term. The online courses below are open to you.</p>`}
          <h2 class="rule">Online, open to ${esc(l.name)} learners</h2>
          <ul class="course-list">${online.map((c) => courseItem(c.id, true, id)).join("")}</ul>
        </div>
        <aside>
          <div class="aside-box">
            <h3>Your learning hub</h3>
            <p>${esc(l.hub)}</p>
            <p class="muted">Free Wi-Fi, devices to borrow and a facilitator on site during opening hours.</p>
          </div>
          <div class="aside-box">
            <h3>Who to contact</h3>
            ${contactBlock(l.contact)}
            <div class="btn-row" style="margin-bottom:0"><a class="btn" href="mailto:${esc(D.contacts[l.contact].email)}?subject=${encodeURIComponent("Course question – " + l.name)}">Email your coordinator</a></div>
          </div>
        </aside>
      </div></section>
      <section><div class="wrap">
        <h2 class="rule">Diplomas you can work towards in ${esc(l.name)}</h2>
        <p class="muted" style="margin-top:-8px;margin-bottom:24px">Courses stack into one-year diplomas. Credits from courses you have already taken count.</p>
        <div class="dip-grid">${dips}</div>
      </div></section>`;
  }

  function stackLadder(currentId) {
    const f = degree("foundation");
    const dip = currentId && currentId !== "foundation" ? degree(currentId) : null;
    const levels = [
      `<a class="level ${currentId === "foundation" ? "current" : ""}" href="#/degree/foundation"><span>${esc(f.short)}</span><small>${f.ects} ECTS · half year</small></a>`,
      dip
        ? `<a class="level current" href="#/degree/${dip.id}"><span>${esc(dip.title)}</span><small>${dip.ects} ECTS · 1 year</small></a>`
        : `<a class="level" href="#/diplomas"><span>One-year GUA diploma</span><small>60 ECTS · 1 year</small></a>`,
      `<a class="level" href="#/course/C13"><span>${esc(D.topOfStack.title)}</span><small>180 ECTS · ~3 years</small></a>`,
    ];
    return `<div class="stack">${levels.join("")}</div><p class="stack-note">${esc(D.topOfStack.note)}</p>`;
  }

  function viewCourse(id, from) {
    const c = D.courses[id];
    if (!c) return notFound();
    const l = from ? loc(from) : null;
    const sites = locationsFor(id);
    const isOnline = D.onlineEverywhere.includes(id);
    const dips = degreesFor(id);
    const contactId = l ? l.contact : (sites[0] ? sites[0].contact : "hala");
    const lead = D.courseLeads[id];

    const whereList = isOnline
      ? `<p>Online at every GUA location${sites.length ? `, plus on site in ${sites.map((s) => esc(s.name)).join(", ")}` : ""}.</p>`
      : `<p>${sites.map((s) => `<a href="#/location/${s.id}">${esc(s.name)}</a>`).join(", ")}</p>`;

    const stackSection = c.isDegree
      ? `<h2 class="rule">How to get here</h2>
         <p>This is the top of the GUA stack. Finish the Foundation Certificate and a one-year diploma first, and your credits can count towards your degree.</p>
         ${stackLadder(null)}`
      : `<h2 class="rule">Stackable towards</h2>
         <p>This course counts towards ${dips.length} GUA qualification${dips.length === 1 ? "" : "s"}. Take it on its own, or keep going and earn a diploma.</p>
         <div class="dip-grid" style="margin-bottom:32px">${dips.map((d) => `
           <a class="dip-card" href="#/degree/${d.id}${fromQ(from)}" style="background:${d.colour}">
             <p class="eyebrow">${esc(d.type)} · ${d.ects} ECTS</p>
             <h3>${esc(d.title)}</h3>
             <p>${d.core.includes(id) ? "Core course" : "Elective"} · ${c.ects} of ${d.ects} credits</p>
             <div class="foot"><span>View diploma</span><span>→</span></div>
           </a>`).join("")}</div>
         ${stackLadder(null)}`;

    return `
      <div class="page-hero"><div class="wrap">
        ${crumbs(l ? [["Find a course", "#/"], [l.name, `#/location/${l.id}`], [c.title]] : [["Find a course", "#/"], [c.title]])}
        <p class="eyebrow">${esc(c.topic)} · ${esc(c.partner)}</p>
        <h1>${esc(c.title)}</h1>
        ${c.subtitle ? `<p style="margin-top:-4px">${esc(c.subtitle)}</p>` : ""}
        <p class="lead">${esc(c.summary)}</p>
        <div class="btn-row"><a class="btn" href="#contact">How to apply</a><a class="btn ghost" href="#stack">See where it leads</a></div>
      </div></div>
      <section><div class="wrap two-col">
        <div>
          <h2 class="rule">About the course</h2>
          <p>${esc(c.description)}</p>
          <h2 class="rule" style="margin-top:40px">What you will learn</h2>
          <ul class="learn">${c.learn.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          <h2 class="rule">Who can apply</h2>
          <p>${esc(c.requirements)}</p>
          <blockquote>“${esc(c.quote.text)}”<footer>${esc(c.quote.by)}, GUA learner</footer></blockquote>
          <div id="stack">${stackSection}</div>
        </div>
        <aside>
          <div class="aside-box">
            <h3>Key facts</h3>
            <dl class="facts">
              <div><dt>Next start</dt><dd>${esc(c.nextStart)}</dd></div>
              <div><dt>Apply by</dt><dd>${esc(c.applyBy)}</dd></div>
              <div><dt>Duration</dt><dd>${esc(c.duration)}</dd></div>
              <div><dt>Study time</dt><dd>${esc(c.hours)}</dd></div>
              <div><dt>Format</dt><dd>${esc(c.mode)}</dd></div>
              <div><dt>Credits</dt><dd>${c.ects} ECTS</dd></div>
              <div><dt>Language</dt><dd>${esc(c.languages.join(", "))}</dd></div>
              <div><dt>Level</dt><dd>${esc(c.level)}</dd></div>
              <div><dt>Status</dt><dd>${esc(c.accreditation)}</dd></div>
              <div><dt>Cost</dt><dd>Free for refugee and host-community learners</dd></div>
              <div><dt>Delivered by</dt><dd>${esc(c.partner)}${c.coPartner ? ` with ${esc(c.coPartner)}` : ""}<br><span class="muted">${esc(c.programme)}</span></dd></div>
            </dl>
          </div>
          <div class="aside-box">
            <h3>Where it runs</h3>
            ${whereList}
          </div>
          <div class="aside-box" id="contact">
            <h3>Who to contact</h3>
            <p>To apply or ask about places${l ? ` in ${esc(l.name)}` : ""}, contact your site coordinator:</p>
            ${contactBlock(contactId)}
            <div class="contact-card">
              <p class="who">${esc(lead.name)}</p>
              <p>Course lead, ${esc(c.partner)}</p>
              <p><a href="mailto:${esc(lead.email)}">${esc(lead.email)}</a></p>
              <p class="muted">For questions about course content</p>
            </div>
            <div class="btn-row" style="margin-bottom:0"><a class="btn" href="mailto:${esc(D.contacts[contactId].email)}?subject=${encodeURIComponent("Application – " + c.title)}">Email to apply</a></div>
          </div>
        </aside>
      </div></section>`;
  }

  function viewDegree(id, from) {
    const d = degree(id);
    if (!d) return notFound();
    const l = from ? loc(from) : null;
    const avail = l ? availableIds(l.id) : null;

    const row = (cid, kind) => {
      const c = D.courses[cid];
      const here = avail ? (avail.has(cid)
        ? `<span class="avail yes">${D.onlineEverywhere.includes(cid) && !(D.offerings[l.id] || []).includes(cid) ? "Online" : "At this hub"}</span>`
        : `<span class="avail no">Not here yet</span>`) : "";
      return `<tr>
        <td><a href="#/course/${cid}${fromQ(from)}">${esc(c.title)}</a><br><span class="muted" style="font-size:14px">${esc(c.partner)}</span></td>
        <td class="hide-sm">${kind}</td>
        ${avail ? `<td>${here}</td>` : ""}
        <td class="num">${c.ects}</td>
      </tr>`;
    };
    const coreEcts = d.core.reduce((s, c) => s + D.courses[c].ects, 0);
    const a = l ? degreeAvailability(d, l.id) : null;

    return `
      <div class="page-hero" style="background:${d.colour}"><div class="wrap">
        ${crumbs(l ? [["Find a course", "#/"], [l.name, `#/location/${l.id}`], [d.short]] : [["Find a course", "#/"], ["Diplomas", "#/diplomas"], [d.short]])}
        <p class="eyebrow">${esc(d.type)} · ${d.ects} ECTS</p>
        <h1>${esc(d.title)}</h1>
        <p class="lead">${esc(d.summary)}</p>
      </div></div>
      <section><div class="wrap two-col">
        <div>
          <h2 class="rule">About this ${d.id === "foundation" ? "certificate" : "diploma"}</h2>
          <p>${esc(d.description)}</p>
          <h2 class="rule" style="margin-top:40px">Courses</h2>
          <p>${d.electives.length ? `Take all core courses (${coreEcts} ECTS) and at least ${d.electiveEcts} ECTS of electives.` : `Take all ${d.core.length} courses.`}</p>
          <table class="module-table">
            <thead><tr><th>Course</th><th class="hide-sm">Type</th>${avail ? `<th>In ${esc(l.name)}</th>` : ""}<th class="num">ECTS</th></tr></thead>
            <tbody>${d.core.map((c) => row(c, "Core")).join("")}${d.electives.map((c) => row(c, "Elective")).join("")}</tbody>
          </table>
          <h2 class="rule">Where it leads</h2>
          ${stackLadder(d.id)}
          ${d.id === "foundation" ? `<div class="dip-grid" style="margin-top:24px">${D.degrees.filter((x) => x.id !== "foundation").map((x) => `<a class="dip-card" href="#/degree/${x.id}${fromQ(from)}" style="background:${x.colour}"><p class="eyebrow">${x.ects} ECTS</p><h3>${esc(x.title)}</h3><div class="foot"><span>View</span><span>→</span></div></a>`).join("")}</div>` : ""}
        </div>
        <aside>
          ${a ? `<div class="aside-box">
            <h3>In ${esc(l.name)}</h3>
            <div class="progress" aria-hidden="true"><span style="width:${Math.round((a.reachable / d.ects) * 100)}%"></span></div>
            <p>${a.reachable} of ${d.ects} credits available here${a.complete ? ". You can complete the full qualification." : ". Your coordinator can help you plan the rest, as new courses open every term."}</p>
          </div>` : ""}
          <div class="aside-box">
            <h3>Key facts</h3>
            <dl class="facts">
              <div><dt>Length</dt><dd>${d.id === "foundation" ? "About 6 months" : "1 year full time, or up to 2 years part time"}</dd></div>
              <div><dt>Credits</dt><dd>${d.ects} ECTS</dd></div>
              <div><dt>Awarded by</dt><dd>Global University Academy with partner universities</dd></div>
              <div><dt>Cost</dt><dd>Free for refugee and host-community learners</dd></div>
            </dl>
          </div>
          <div class="aside-box">
            <h3>Graduates go on to</h3>
            <ul style="margin:0;padding-left:20px;font-size:16px">${d.careers.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
          </div>
          <div class="aside-box">
            <h3>Who to contact</h3>
            ${l ? contactBlock(l.contact) : `<p>Your site coordinator can help you plan your diploma. <a href="#/contact">Find your coordinator</a>.</p>`}
          </div>
        </aside>
      </div></section>`;
  }

  function viewDiplomas() {
    return `
      <div class="page-hero"><div class="wrap">
        ${crumbs([["Find a course", "#/"], ["Diplomas"]])}
        <h1>Stackable diplomas</h1>
        <p class="lead">Every GUA course earns credits. Collect them into a half-year certificate, a one-year diploma and, if you want, a full bachelor's degree. You can stop at any step and still leave with a qualification.</p>
      </div></div>
      <section><div class="wrap two-col">
        <div>
          <h2 class="rule">Choose your diploma</h2>
          <div class="dip-grid">${D.degrees.map((d) => `
            <a class="dip-card" href="#/degree/${d.id}" style="background:${d.colour}">
              <p class="eyebrow">${esc(d.type)} · ${d.ects} ECTS</p>
              <h3>${esc(d.title)}</h3>
              <p>${esc(d.summary)}</p>
              <div class="foot"><span>${d.core.length + d.electives.length} courses</span><span>→</span></div>
            </a>`).join("")}</div>
        </div>
        <aside>
          <div class="aside-box"><h3>How stacking works</h3>${stackLadder(null)}</div>
        </aside>
      </div></section>`;
  }

  function viewContact() {
    const byContact = {};
    D.locations.forEach((l) => (byContact[l.contact] ??= []).push(l.name));
    return `
      <div class="page-hero"><div class="wrap">
        ${crumbs([["Find a course", "#/"], ["Contact"]])}
        <h1>Contact us</h1>
        <p class="lead">Your site coordinator is the best first contact for applications, places and study support.</p>
      </div></div>
      <section><div class="wrap two-col">
        <div>
          <h2 class="rule">Site coordinators</h2>
          ${Object.entries(byContact).map(([cid, sites]) => `${contactBlock(cid)}<p class="muted" style="font-size:15px;margin:-6px 0 16px">Covers ${esc(sites.join(", "))}</p>`).join("")}
        </div>
        <aside><div class="aside-box">
          <h3>General enquiries</h3>
          <p><a href="mailto:${esc(D.generalContact.email)}">${esc(D.generalContact.email)}</a></p>
          <p class="muted">${esc(D.generalContact.note)}</p>
        </div></aside>
      </div></section>`;
  }

  function viewSearch(q) {
    const term = q.trim().toLowerCase();
    const hits = Object.entries(D.courses).filter(([, c]) =>
      [c.title, c.summary, c.topic, c.partner, c.languages.join(" ")].join(" ").toLowerCase().includes(term));
    return `
      <div class="page-hero"><div class="wrap">
        ${crumbs([["Find a course", "#/"], ["Search"]])}
        <h1>Results for “${esc(q)}”</h1>
        <p class="lead">${hits.length} course${hits.length === 1 ? "" : "s"} found.</p>
      </div></div>
      <section><div class="wrap">
        ${hits.length ? `<ul class="course-list">${hits.map(([id]) => courseItem(id, D.onlineEverywhere.includes(id), null)).join("")}</ul>` : `<p class="empty">No courses match. Try “health”, “English” or “teaching”, or <a href="#/">choose your location</a>.</p>`}
      </div></section>`;
  }

  function notFound() {
    return `<section><div class="wrap"><h1>Page not found</h1><p><a href="#/">Back to Find a course</a></p></div></section>`;
  }

  /* ---------- router ---------- */
  function render() {
    const raw = location.hash.replace(/^#/, "") || "/";
    // In-page anchors (e.g. #contact) — let the browser scroll, don't re-render.
    if (!raw.startsWith("/")) {
      document.getElementById(raw)?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    const [path, query = ""] = raw.split("?");
    const params = new URLSearchParams(query);
    const parts = path.split("/").filter(Boolean);
    const from = params.get("from");
    let html, title = "Find a course";

    if (parts.length === 0) html = viewHome();
    else if (parts[0] === "location") { html = viewLocation(parts[1]); title = loc(parts[1])?.name || title; }
    else if (parts[0] === "course") { html = viewCourse(parts[1], from); title = D.courses[parts[1]]?.title || title; }
    else if (parts[0] === "degree") { html = viewDegree(parts[1], from); title = degree(parts[1])?.short || title; }
    else if (parts[0] === "diplomas") { html = viewDiplomas(); title = "Diplomas"; }
    else if (parts[0] === "contact") { html = viewContact(); title = "Contact"; }
    else if (parts[0] === "search") { const q = params.get("q") || ""; html = viewSearch(q); title = "Search"; }
    else html = notFound();

    main.innerHTML = html;
    document.title = `${title} – Global University Academy`;
    if (raw === "/" && location.hash.includes("locations")) document.getElementById("locations")?.scrollIntoView();
    else window.scrollTo(0, 0);
    closeMenu();
  }

  // In-page buttons like "How to apply" use plain anchors; intercept so they scroll instead of routing.
  main.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#']");
    if (!a) return;
    const href = a.getAttribute("href");
    if (href === "#/#locations") {
      e.preventDefault();
      if (location.hash !== "#/") { location.hash = "#/"; setTimeout(() => document.getElementById("locations")?.scrollIntoView(), 0); }
      else document.getElementById("locations")?.scrollIntoView({ behavior: "smooth" });
    } else if (!href.startsWith("#/")) {
      e.preventDefault();
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }
  });

  /* ---------- header ---------- */
  const menuBtn = document.getElementById("menu-btn");
  const menu = document.getElementById("menu");
  function closeMenu() { menu.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); }
  menuBtn.addEventListener("click", () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
  });
  document.getElementById("search-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = document.getElementById("q").value;
    if (q.trim()) location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });

  window.addEventListener("hashchange", render);
  render();
})();
